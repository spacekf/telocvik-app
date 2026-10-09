import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getActiveSchoolYear } from "./common";
import { getActiveEnrollment } from "./enrollment";

/**
 * Kontext přihlášeného studenta: profil, AKTUÁLNÍ skupina (přes enrollment
 * aktivního školního roku), rok, aktuální pololetí. Fallback na denormalizované
 * Student.classGroup pro starší data bez enrollmentu.
 */
export async function getStudentContext(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      classGroup: { include: { schoolYear: true } },
    },
  });
  if (!student) return null;

  const enrollment = await getActiveEnrollment(student.id);
  const classGroup = enrollment?.classGroup ?? student.classGroup;

  const schoolYear = classGroup?.schoolYear ?? (await getActiveSchoolYear());
  let activeTerm = null;
  if (schoolYear) {
    activeTerm =
      (await prisma.term.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { order: "asc" },
      })) ?? null;
  }

  return { student, classGroup, schoolYear, activeTerm };
}

/** Poslední změny výsledků studenta (pro dashboard). */
export async function getStudentRecentChanges(studentId: string, take = 6) {
  const results = await prisma.result.findMany({
    where: { studentId },
    orderBy: { updatedAt: "desc" },
    take,
    include: { discipline: true, assessment: true },
  });
  return results.map((r) => ({
    id: r.id,
    discipline: r.discipline.name,
    type: r.assessment.assessmentType,
    rawValue: r.rawValue ?? "",
    points: r.points,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
