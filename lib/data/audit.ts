import "server-only";

import type { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { getAccessibleClassGroups } from "./common";

export const AUDIT_PAGE_SIZE = 25;

export type AuditRow = {
  id: string;
  createdAt: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  studentName: string | null;
  disciplineName: string | null;
  assessmentType: string | null;
  oldValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
};

type RawLog = Prisma.AuditLogGetPayload<{ include: { user: true } }>;

function meta(log: RawLog): Record<string, unknown> | null {
  const m = log.metadataJson;
  return m && typeof m === "object" && !Array.isArray(m)
    ? (m as Record<string, unknown>)
    : null;
}

/** Doplní jména studentů a disciplín z metadat (batch fetch). */
async function enrich(logs: RawLog[]): Promise<AuditRow[]> {
  const studentIds = new Set<string>();
  const disciplineIds = new Set<string>();
  for (const l of logs) {
    const m = meta(l);
    if (typeof m?.studentId === "string") studentIds.add(m.studentId);
    if (typeof m?.disciplineId === "string") disciplineIds.add(m.disciplineId);
  }

  const [students, disciplines] = await Promise.all([
    studentIds.size
      ? prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    disciplineIds.size
      ? prisma.discipline.findMany({
          where: { id: { in: [...disciplineIds] } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const studentMap = new Map(
    students.map((s) => [s.id, `${s.lastName} ${s.firstName}`]),
  );
  const disciplineMap = new Map(disciplines.map((d) => [d.id, d.name]));

  return logs.map((l) => {
    const m = meta(l);
    return {
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      userName: l.user?.username ?? "—",
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      studentName:
        typeof m?.studentId === "string"
          ? (studentMap.get(m.studentId) ?? null)
          : null,
      disciplineName:
        typeof m?.disciplineId === "string"
          ? (disciplineMap.get(m.disciplineId) ?? null)
          : null,
      assessmentType:
        typeof m?.assessmentType === "string" ? m.assessmentType : null,
      oldValue: l.oldValueJson ?? null,
      newValue: l.newValueJson ?? null,
      metadata: m,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
    };
  });
}

export type AuditFilters = {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  studentId?: string;
  classGroupId?: string;
  assessmentType?: string;
  search?: string;
  page?: number;
};

function buildAdminWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const AND: Prisma.AuditLogWhereInput[] = [];

  if (f.dateFrom) AND.push({ createdAt: { gte: new Date(f.dateFrom) } });
  if (f.dateTo) {
    const to = new Date(f.dateTo);
    to.setHours(23, 59, 59, 999);
    AND.push({ createdAt: { lte: to } });
  }
  if (f.userId) AND.push({ userId: f.userId });
  if (f.action) AND.push({ action: f.action as AuditAction });
  if (f.entityType) AND.push({ entityType: f.entityType });
  if (f.studentId)
    AND.push({ metadataJson: { path: "$.studentId", equals: f.studentId } });
  if (f.classGroupId)
    AND.push({ metadataJson: { path: "$.classGroupId", equals: f.classGroupId } });
  if (f.assessmentType)
    AND.push({
      metadataJson: { path: "$.assessmentType", equals: f.assessmentType },
    });
  if (f.search) {
    AND.push({
      OR: [
        { entityId: { contains: f.search } },
        { user: { username: { contains: f.search } } },
        { user: { email: { contains: f.search } } },
      ],
    });
  }

  return AND.length ? { AND } : {};
}

/** Kompletní audit log se stránkováním a filtry (správcovský pohled). */
export async function getAllAuditLogs(filters: AuditFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildAdminWhere(filters);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    rows: await enrich(logs),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}

/**
 * Učitel: historie změn POUZE pro jeho skupiny (přes metadata.classGroupId).
 * Učitel nikdy nevidí logy skupin, které nemá přiřazené.
 */
export async function getTeacherAuditLogs(
  user: SessionUser,
  filters: AuditFilters,
) {
  const groups = await getAccessibleClassGroups(user);
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) {
    return { rows: [], total: 0, page: 1, pageCount: 1 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.AuditLogWhereInput = {
    action: { in: ["RESULT_UPDATE", "ATTENDANCE_UPDATE"] },
    OR: groupIds.map((id) => ({
      metadataJson: { path: "$.classGroupId", equals: id },
    })),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    rows: await enrich(logs),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}

/** Posledních N logů pro skupiny učitele (dashboard). */
export async function getRecentAuditLogsForGroups(
  groupIds: string[],
  take = 5,
) {
  if (groupIds.length === 0) return [];
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["RESULT_UPDATE", "ATTENDANCE_UPDATE"] },
      OR: groupIds.map((id) => ({
        metadataJson: { path: "$.classGroupId", equals: id },
      })),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return enrich(logs);
}

/** Posledních N logů celkem (admin dashboard). */
export async function getRecentAuditLogs(take = 10) {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return enrich(logs);
}

/** Počet logů od daného data (celkově – admin). */
export async function countRecentChanges(since: Date) {
  return prisma.auditLog.count({ where: { createdAt: { gte: since } } });
}

/** Počet změn výsledků/docházky ve skupinách učitele od daného data. */
export async function countGroupChangesSince(groupIds: string[], since: Date) {
  if (groupIds.length === 0) return 0;
  return prisma.auditLog.count({
    where: {
      createdAt: { gte: since },
      action: { in: ["RESULT_UPDATE", "ATTENDANCE_UPDATE"] },
      OR: groupIds.map((id) => ({
        metadataJson: { path: "$.classGroupId", equals: id },
      })),
    },
  });
}
