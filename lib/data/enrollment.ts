import "server-only";

import type { Student } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Zařazení žáků je vedeno přes StudentEnrollment (student × skupina × školní rok).
 * Skupina (ClassGroup) je vždy vázaná na konkrétní školní rok, takže "žáci ve
 * skupině" = enrollmenty této skupiny. Historie zůstává zachovaná napříč roky.
 */

export type EnrolledStudent = Student & {
  user: { id: string; mustChangePassword: boolean } | null;
};

/**
 * KANONICKÝ zdroj pravdy pro "žáci ve skupině daného školního roku".
 * Vždy přes StudentEnrollment (ne přes Student.classGroupId). schoolYearId je
 * sice u year-specific skupiny redundantní, ale slouží jako explicitní pojistka.
 */
export async function getStudentsForClassGroup(params: {
  schoolYearId: string;
  classGroupId: string;
}): Promise<EnrolledStudent[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classGroupId: params.classGroupId,
      schoolYearId: params.schoolYearId,
    },
    include: {
      student: { include: { user: { select: { id: true, mustChangePassword: true } } } },
    },
  });
  return enrollments
    .map((e) => e.student)
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "cs") ||
        a.firstName.localeCompare(b.firstName, "cs"),
    );
}

/** Počet žáků zařazených do skupiny. */
export async function countEnrolledStudents(
  classGroupId: string,
): Promise<number> {
  return prisma.studentEnrollment.count({ where: { classGroupId } });
}

/** Aktuální zařazení žáka podle aktivního školního roku (status ACTIVE). */
export async function getActiveEnrollment(studentId: string) {
  const activeYear =
    (await prisma.schoolYear.findFirst({ where: { isActive: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startsAt: "desc" } }));
  if (!activeYear) return null;

  return prisma.studentEnrollment.findFirst({
    where: { studentId, schoolYearId: activeYear.id },
    include: { classGroup: { include: { schoolYear: true } } },
  });
}

/**
 * ID aktuální skupiny žáka. Preferuje aktivní enrollment, fallback na
 * denormalizované Student.classGroupId (pro starší data bez enrollmentu).
 */
export async function getCurrentClassGroupId(
  studentId: string,
): Promise<string | null> {
  const enrollment = await getActiveEnrollment(studentId);
  if (enrollment) return enrollment.classGroupId;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classGroupId: true },
  });
  return student?.classGroupId ?? null;
}

/**
 * Zajistí enrollment žáka pro daný rok+skupinu (idempotentní – při existujícím
 * enrollmentu pro [student, rok] nevytváří duplicitu). Synchronizuje i
 * denormalizované Student.classGroupId, pokud je rok aktivní.
 */
export async function ensureEnrollment(params: {
  studentId: string;
  classGroupId: string;
  schoolYearId: string;
  syncCurrentGroup?: boolean;
}): Promise<{ created: boolean }> {
  const existing = await prisma.studentEnrollment.findUnique({
    where: {
      studentId_schoolYearId: {
        studentId: params.studentId,
        schoolYearId: params.schoolYearId,
      },
    },
  });

  if (!existing) {
    await prisma.studentEnrollment.create({
      data: {
        studentId: params.studentId,
        classGroupId: params.classGroupId,
        schoolYearId: params.schoolYearId,
        status: "ACTIVE",
      },
    });
  }

  if (params.syncCurrentGroup) {
    await prisma.student.update({
      where: { id: params.studentId },
      data: { classGroupId: params.classGroupId },
    });
  }

  return { created: !existing };
}
