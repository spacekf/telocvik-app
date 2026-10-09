import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { AssessmentType } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

export async function getGradeRules(type: AssessmentType) {
  return prisma.gradeRule.findMany({
    where: { assessmentType: type },
    orderBy: { grade: "asc" },
  });
}

export async function getActiveSchoolYear() {
  return (
    (await prisma.schoolYear.findFirst({ where: { isActive: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startsAt: "desc" } }))
  );
}

export async function getSchoolYears() {
  return prisma.schoolYear.findMany({ orderBy: { startsAt: "desc" } });
}

export async function getTermsForYear(schoolYearId: string) {
  return prisma.term.findMany({
    where: { schoolYearId },
    orderBy: { order: "asc" },
  });
}

/**
 * Skupiny dostupné danému uživateli. Učitel je správcovská role,
 * takže vidí všechny skupiny. Student žádné (data si načítá jinou cestou).
 */
export async function getAccessibleClassGroups(
  user: SessionUser,
  schoolYearId?: string,
) {
  if (user.role !== "TEACHER") return [];

  return prisma.classGroup.findMany({
    where: schoolYearId ? { schoolYearId } : undefined,
    orderBy: { name: "asc" },
  });
}
