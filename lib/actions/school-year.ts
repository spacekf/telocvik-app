"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  createSchoolYearSchema,
  rolloverSchema,
} from "@/lib/validators/school-year";
import {
  computeRolloverPreview,
  runRollover,
  isRolloverError,
  type RolloverPreview,
  type RolloverSummary,
} from "@/lib/data/rollover";

export type { RolloverPreview, RolloverRow } from "@/lib/data/rollover";

export type SchoolYearResult<T = undefined> = {
  ok: boolean;
  error?: string;
  data?: T;
};

/** Vytvoří (nebo vrátí existující) školní rok. Idempotentní podle názvu. */
export async function createSchoolYear(
  input: unknown,
): Promise<SchoolYearResult<{ id: string; name: string }>> {
  await requireRole("TEACHER");
  const parsed = createSchoolYearSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { name } = parsed.data;

  const yearMatch = name.match(/(\d{4})/);
  const startYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  const startsAt = parsed.data.startsAt
    ? new Date(parsed.data.startsAt)
    : new Date(Date.UTC(startYear, 8, 1));
  const endsAt = parsed.data.endsAt
    ? new Date(parsed.data.endsAt)
    : new Date(Date.UTC(startYear + 1, 5, 30));

  const existing = await prisma.schoolYear.findUnique({ where: { name } });
  const year =
    existing ??
    (await prisma.schoolYear.create({
      data: { name, startsAt, endsAt, isActive: false },
    }));

  revalidatePath("/ucitel/skolni-roky");
  return { ok: true, data: { id: year.id, name: year.name } };
}

/** Náhled převodu (read-only). Ověří roli a deleguje na čistou logiku. */
export async function getRolloverPreview(
  sourceSchoolYearId: string,
  targetSchoolYearId: string,
): Promise<SchoolYearResult<RolloverPreview>> {
  await requireRole("TEACHER");
  const result = await computeRolloverPreview(
    sourceSchoolYearId,
    targetSchoolYearId,
  );
  if (isRolloverError(result)) return { ok: false, error: result.error };
  return { ok: true, data: result };
}

/** Provede převod, zapíše AuditLog SCHOOL_YEAR_ROLLOVER. */
export async function executeRollover(
  input: unknown,
): Promise<SchoolYearResult<{ message: string; summary: RolloverSummary }>> {
  const teacher = await requireRole("TEACHER");
  const parsed = rolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { sourceSchoolYearId, targetSchoolYearId } = parsed.data;

  const summary = await runRollover(sourceSchoolYearId, targetSchoolYearId);
  if (isRolloverError(summary)) return { ok: false, error: summary.error };

  await createAuditLog({
    userId: teacher.id,
    action: "SCHOOL_YEAR_ROLLOVER",
    entityType: "SchoolYear",
    entityId: targetSchoolYearId,
    metadata: { sourceSchoolYearId, targetSchoolYearId, ...summary },
  });

  revalidatePath("/ucitel/skupiny");
  revalidatePath("/ucitel/skolni-roky");

  return {
    ok: true,
    data: {
      message: `Převod dokončen: vytvořeno ${summary.createdGroups} skupin, převedeno ${summary.createdEnrollments} žáků, ${summary.graduatedStudents} absolventů, přeskočeno ${summary.skippedExistingEnrollments}.`,
      summary,
    },
  };
}
