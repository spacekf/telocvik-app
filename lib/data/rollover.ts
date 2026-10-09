import { prisma } from "@/lib/db/prisma";

/**
 * Čistá logika převodu školního roku (bez auth/auditu) – díky tomu testovatelná
 * i mimo request scope. Server action ji obaluje ověřením role a audit logem.
 */

const GENDER_LABEL = { GIRLS: "dívky", BOYS: "chlapci" } as const;

export function rolloverGroupName(
  gradeYear: number,
  gender: "GIRLS" | "BOYS",
): string {
  return `${gradeYear}. ročník – ${GENDER_LABEL[gender]}`;
}

export type RolloverRow = {
  sourceGroupId: string;
  sourceGroupName: string;
  gradeYear: number;
  gender: "GIRLS" | "BOYS";
  targetGroupName: string | null;
  isGraduation: boolean;
  studentCount: number;
  alreadyDone: number;
  targetGroupExists: boolean;
};

export type RolloverPreview = {
  sourceYearName: string;
  targetYearName: string;
  rows: RolloverRow[];
  totals: {
    createdGroups: number;
    studentsToTransfer: number;
    studentsToGraduate: number;
    skippedExisting: number;
  };
  warnings: string[];
};

export type RolloverSummary = {
  createdGroups: number;
  createdEnrollments: number;
  graduatedStudents: number;
  skippedExistingEnrollments: number;
};

export type RolloverError = { error: string };

function isError(v: unknown): v is RolloverError {
  return typeof v === "object" && v !== null && "error" in v;
}
export { isError as isRolloverError };

/** Spočítá náhled převodu (read-only). */
export async function computeRolloverPreview(
  sourceSchoolYearId: string,
  targetSchoolYearId: string,
): Promise<RolloverPreview | RolloverError> {
  if (!sourceSchoolYearId || !targetSchoolYearId) {
    return { error: "Vyberte zdrojový i cílový rok." };
  }
  if (sourceSchoolYearId === targetSchoolYearId) {
    return { error: "Zdrojový a cílový rok musí být různé." };
  }

  const [sourceYear, targetYear] = await Promise.all([
    prisma.schoolYear.findUnique({ where: { id: sourceSchoolYearId } }),
    prisma.schoolYear.findUnique({ where: { id: targetSchoolYearId } }),
  ]);
  if (!sourceYear || !targetYear) return { error: "Školní rok nenalezen." };

  const [sourceGroups, targetGroups, targetEnrollments] = await Promise.all([
    prisma.classGroup.findMany({
      where: { schoolYearId: sourceSchoolYearId },
      orderBy: [{ gradeYear: "asc" }, { gender: "asc" }],
      include: { enrollments: { select: { studentId: true, status: true } } },
    }),
    prisma.classGroup.findMany({
      where: { schoolYearId: targetSchoolYearId },
      select: { name: true },
    }),
    prisma.studentEnrollment.findMany({
      where: { schoolYearId: targetSchoolYearId },
      select: { studentId: true },
    }),
  ]);

  const targetGroupNames = new Set(targetGroups.map((g) => g.name));
  const targetEnrolledIds = new Set(targetEnrollments.map((e) => e.studentId));

  const rows: RolloverRow[] = [];
  let createdGroups = 0;
  let studentsToTransfer = 0;
  let studentsToGraduate = 0;
  let skippedExisting = 0;
  const plannedNewGroups = new Set<string>();

  for (const g of sourceGroups) {
    const active = g.enrollments.filter((e) => e.status === "ACTIVE");

    if (g.gradeYear >= 4) {
      studentsToGraduate += active.length;
      rows.push({
        sourceGroupId: g.id,
        sourceGroupName: g.name,
        gradeYear: g.gradeYear,
        gender: g.gender,
        targetGroupName: null,
        isGraduation: true,
        studentCount: active.length,
        alreadyDone: g.enrollments.length - active.length,
        targetGroupExists: false,
      });
      continue;
    }

    const targetName = rolloverGroupName(g.gradeYear + 1, g.gender);
    const exists = targetGroupNames.has(targetName);
    if (!exists && !plannedNewGroups.has(targetName)) {
      createdGroups++;
      plannedNewGroups.add(targetName);
    }

    let transfer = 0;
    let already = 0;
    for (const e of active) {
      if (targetEnrolledIds.has(e.studentId)) already++;
      else transfer++;
    }
    studentsToTransfer += transfer;
    skippedExisting += already;

    rows.push({
      sourceGroupId: g.id,
      sourceGroupName: g.name,
      gradeYear: g.gradeYear,
      gender: g.gender,
      targetGroupName: targetName,
      isGraduation: false,
      studentCount: transfer,
      alreadyDone: already,
      targetGroupExists: exists,
    });
  }

  const warnings: string[] = [];
  if (targetGroups.length > 0) {
    warnings.push(`Cílový rok už obsahuje ${targetGroups.length} skupin.`);
  }
  if (targetEnrollments.length > 0) {
    warnings.push(
      `Cílový rok už má ${targetEnrollments.length} zařazených žáků – ti budou přeskočeni.`,
    );
  }

  return {
    sourceYearName: sourceYear.name,
    targetYearName: targetYear.name,
    rows,
    totals: {
      createdGroups,
      studentsToTransfer,
      studentsToGraduate,
      skippedExisting,
    },
    warnings,
  };
}

/**
 * Provede převod. Idempotentní – nevytváří duplicitní skupiny ani enrollmenty,
 * znovu neabsolvuje. Nemaže/nepřepisuje výsledky, docházku ani assessmenty.
 */
export async function runRollover(
  sourceSchoolYearId: string,
  targetSchoolYearId: string,
): Promise<RolloverSummary | RolloverError> {
  const [sourceYear, targetYear] = await Promise.all([
    prisma.schoolYear.findUnique({ where: { id: sourceSchoolYearId } }),
    prisma.schoolYear.findUnique({ where: { id: targetSchoolYearId } }),
  ]);
  if (!sourceYear || !targetYear) return { error: "Školní rok nenalezen." };

  const sourceGroups = await prisma.classGroup.findMany({
    where: { schoolYearId: sourceSchoolYearId },
    include: { enrollments: true },
  });

  let createdGroups = 0;
  let createdEnrollments = 0;
  let graduatedStudents = 0;
  let skippedExistingEnrollments = 0;

  for (const g of sourceGroups) {
    if (g.gradeYear >= 4) {
      for (const e of g.enrollments) {
        if (e.status === "ACTIVE") {
          await prisma.studentEnrollment.update({
            where: { id: e.id },
            data: { status: "GRADUATED" },
          });
          graduatedStudents++;
        }
      }
      continue;
    }

    const targetName = rolloverGroupName(g.gradeYear + 1, g.gender);
    let target = await prisma.classGroup.findUnique({
      where: {
        schoolYearId_name: { schoolYearId: targetSchoolYearId, name: targetName },
      },
    });
    if (!target) {
      target = await prisma.classGroup.create({
        data: {
          name: targetName,
          schoolYearId: targetSchoolYearId,
          gradeYear: g.gradeYear + 1,
          gender: g.gender,
        },
      });
      createdGroups++;
    }

    for (const e of g.enrollments) {
      if (e.status !== "ACTIVE") continue;
      const existingTarget = await prisma.studentEnrollment.findUnique({
        where: {
          studentId_schoolYearId: {
            studentId: e.studentId,
            schoolYearId: targetSchoolYearId,
          },
        },
      });
      if (existingTarget) {
        skippedExistingEnrollments++;
        continue;
      }
      await prisma.studentEnrollment.create({
        data: {
          studentId: e.studentId,
          classGroupId: target.id,
          schoolYearId: targetSchoolYearId,
          status: "ACTIVE",
        },
      });
      createdEnrollments++;
    }
  }

  return {
    createdGroups,
    createdEnrollments,
    graduatedStudents,
    skippedExistingEnrollments,
  };
}
