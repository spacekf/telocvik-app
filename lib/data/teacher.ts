import "server-only";

import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getSchoolYears,
  getTermsForYear,
  getAccessibleClassGroups,
  getActiveSchoolYear,
} from "./common";

export type FilterContext = {
  schoolYears: { id: string; name: string }[];
  terms: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  schoolYearId?: string;
  termId?: string;
  classGroupId?: string;
};

/**
 * Vyhodnotí filtr (rok/pololetí/skupina) z URL + oprávnění uživatele.
 * Skupina je vždy omezena na ty, ke kterým má uživatel přístup
 * (student nemůže přes URL získat cizí skupinu).
 */
export async function getFilterContext(
  user: SessionUser,
  params: { schoolYearId?: string; termId?: string; classGroupId?: string },
): Promise<FilterContext> {
  const schoolYears = await getSchoolYears();
  const active = await getActiveSchoolYear();

  const schoolYearId =
    (params.schoolYearId &&
      schoolYears.find((y) => y.id === params.schoolYearId)?.id) ||
    active?.id ||
    schoolYears[0]?.id;

  const terms = schoolYearId ? await getTermsForYear(schoolYearId) : [];
  const termId =
    (params.termId && terms.find((t) => t.id === params.termId)?.id) ||
    terms[0]?.id;

  const groups = schoolYearId
    ? await getAccessibleClassGroups(user, schoolYearId)
    : [];
  const classGroupId =
    (params.classGroupId &&
      groups.find((g) => g.id === params.classGroupId)?.id) ||
    groups[0]?.id;

  return {
    schoolYears: schoolYears.map((y) => ({ id: y.id, name: y.name })),
    terms: terms.map((t) => ({ id: t.id, name: t.name })),
    groups: groups.map((g) => ({ id: g.id, name: g.name })),
    schoolYearId,
    termId,
    classGroupId,
  };
}

/** Dashboard učitele: jeho skupiny + počty žáků + poslední úpravy. */
export async function getTeacherDashboard(user: SessionUser) {
  const groups = await getAccessibleClassGroups(user);
  const groupsWithCounts = await Promise.all(
    groups.map(async (g) => ({
      id: g.id,
      name: g.name,
      studentCount: await prisma.studentEnrollment.count({
        where: { classGroupId: g.id },
      }),
    })),
  );

  const groupIds = groups.map((g) => g.id);
  const recentResults = groupIds.length
    ? await prisma.result.findMany({
        where: { assessment: { classGroupId: { in: groupIds } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { student: true, discipline: true },
      })
    : [];

  return {
    groups: groupsWithCounts,
    recent: recentResults.map((r) => ({
      id: r.id,
      student: `${r.student.lastName} ${r.student.firstName}`,
      discipline: r.discipline.name,
      rawValue: r.rawValue ?? "",
      points: r.points,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}
