import "server-only";

import { Prisma, type AssessmentType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  calculateGrade,
  calculateTotalPoints,
  formatPerformanceValue,
} from "@/lib/scoring/scoring";
import { getGradeRules } from "./common";
import { getStudentsForClassGroup, getCurrentClassGroupId } from "./enrollment";

const TYPE_TITLE: Record<AssessmentType, string> = {
  ATHLETICS: "Atletika",
  FITNESS: "Fyzická zdatnost",
};

/**
 * Race-safe získání/založení assessmentu pro skupinu + pololetí + typ.
 * Po resetu dat se stránka načítá paralelně a `upsert` padal na unique
 * constraint (P2002). Tady: najdi → vytvoř → při P2002 znovu najdi.
 * Nikdy nemaže data ani nevytváří duplicity.
 */
async function getOrCreateAssessment(params: {
  classGroupId: string;
  schoolYearId: string;
  termId: string;
  assessmentType: AssessmentType;
  title: string;
}) {
  const where = {
    classGroupId_termId_assessmentType: {
      classGroupId: params.classGroupId,
      termId: params.termId,
      assessmentType: params.assessmentType,
    },
  };

  const existing = await prisma.assessment.findUnique({ where });
  if (existing) return existing;

  try {
    return await prisma.assessment.create({
      data: {
        classGroupId: params.classGroupId,
        schoolYearId: params.schoolYearId,
        termId: params.termId,
        assessmentType: params.assessmentType,
        title: params.title,
      },
    });
  } catch (error) {
    // Jiný (paralelní) request stihl assessment vytvořit → načti ho znovu.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const afterRace = await prisma.assessment.findUnique({ where });
      if (afterRace) return afterRace;
    }
    throw error;
  }
}

/** Zajistí existenci assessmentu pro skupinu + pololetí + typ (idempotentní). */
export async function ensureAssessment(
  classGroupId: string,
  termId: string,
  assessmentType: AssessmentType,
) {
  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
  });
  if (!group) throw new Error("Skupina neexistuje.");

  return getOrCreateAssessment({
    classGroupId,
    schoolYearId: group.schoolYearId,
    termId,
    assessmentType,
    title: TYPE_TITLE[assessmentType],
  });
}

export type DisciplineColumn = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  valueType: string;
};

export type AssessmentTableRow = {
  studentId: string;
  studentName: string;
  cells: Record<string, { rawValue: string; points: number }>;
  totalPoints: number;
  grade: number;
};

export type AssessmentTable = {
  assessmentId: string;
  disciplines: DisciplineColumn[];
  rows: AssessmentTableRow[];
};

/** Načte tabulku výsledků (Excel-like) pro učitele/admina. */
export async function getTeacherAssessmentTable(
  classGroupId: string,
  termId: string,
  assessmentType: AssessmentType,
): Promise<AssessmentTable> {
  const group = await prisma.classGroup.findUniqueOrThrow({
    where: { id: classGroupId },
  });

  const disciplines = await prisma.discipline.findMany({
    where: { assessmentType, gender: group.gender, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const assessment = await ensureAssessment(classGroupId, termId, assessmentType);

  const [students, results, gradeRules] = await Promise.all([
    getStudentsForClassGroup({ schoolYearId: group.schoolYearId, classGroupId }),
    prisma.result.findMany({ where: { assessmentId: assessment.id } }),
    getGradeRules(assessmentType),
  ]);

  const rows: AssessmentTableRow[] = students.map((student) => {
    const cells: AssessmentTableRow["cells"] = {};
    const studentResults = results.filter((r) => r.studentId === student.id);

    for (const d of disciplines) {
      const r = studentResults.find((x) => x.disciplineId === d.id);
      cells[d.id] = {
        rawValue: r?.rawValue ?? "",
        points: r?.points ?? 0,
      };
    }

    const totalPoints = calculateTotalPoints(
      disciplines.map((d) => ({ points: cells[d.id].points })),
    );
    const grade = calculateGrade(totalPoints, gradeRules);

    return {
      studentId: student.id,
      studentName: `${student.lastName} ${student.firstName}`,
      cells,
      totalPoints,
      grade,
    };
  });

  return {
    assessmentId: assessment.id,
    disciplines: disciplines.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      unit: d.unit,
      valueType: d.valueType,
    })),
    rows,
  };
}

/** Výsledky jednoho studenta pro daný typ a pololetí (pro student view). */
export async function getStudentResults(
  studentId: string,
  assessmentType: AssessmentType,
  termId?: string,
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  const currentClassGroupId = await getCurrentClassGroupId(studentId);
  if (!student || !currentClassGroupId) {
    return { disciplines: [], items: [], totalPoints: 0, grade: null as number | null };
  }

  const disciplines = await prisma.discipline.findMany({
    where: { assessmentType, gender: student.gender, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const assessment = await prisma.assessment.findFirst({
    where: {
      classGroupId: currentClassGroupId,
      assessmentType,
      ...(termId ? { termId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!assessment) {
    return {
      disciplines: disciplines.map((d) => ({ id: d.id, name: d.name, unit: d.unit })),
      items: disciplines.map((d) => ({
        disciplineId: d.id,
        name: d.name,
        unit: d.unit,
        rawValue: "",
        displayValue: "",
        points: 0,
      })),
      totalPoints: 0,
      grade: null,
    };
  }

  const [results, gradeRules] = await Promise.all([
    prisma.result.findMany({
      where: { assessmentId: assessment.id, studentId },
    }),
    getGradeRules(assessmentType),
  ]);

  const items = disciplines.map((d) => {
    const r = results.find((x) => x.disciplineId === d.id);
    return {
      disciplineId: d.id,
      name: d.name,
      unit: d.unit,
      rawValue: r?.rawValue ?? "",
      displayValue:
        r?.numericValue != null
          ? formatPerformanceValue(r.numericValue, d.valueType)
          : (r?.rawValue ?? ""),
      points: r?.points ?? 0,
    };
  });

  const totalPoints = calculateTotalPoints(items);
  const grade = calculateGrade(totalPoints, gradeRules);

  return { disciplines, items, totalPoints, grade };
}
