"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { requireTeacherClassGroupAccess } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { updateResultSchema } from "@/lib/validators/results";
import {
  parsePerformanceValue,
  calculatePoints,
  calculateTotalPoints,
  calculateGrade,
} from "@/lib/scoring/scoring";
import { getGradeRules } from "@/lib/data/common";

export type UpdateResultResult = {
  ok: boolean;
  error?: string;
  rawValue?: string;
  points?: number;
  totalPoints?: number;
  grade?: number;
};

/**
 * Učitel/admin upraví VÝKON. Server naparsuje hodnotu, spočítá body,
 * přepočítá souhrn studenta, zapíše AuditLog a vrátí nové body + známku.
 */
export async function updateStudentResult(input: {
  assessmentId: string;
  studentId: string;
  disciplineId: string;
  rawValue: string | null;
}): Promise<UpdateResultResult> {
  const user = await requireRole("TEACHER");

  const parsed = updateResultSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Neplatný vstup." };
  }
  const { assessmentId, studentId, disciplineId, rawValue } = parsed.data;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });
  if (!assessment) return { ok: false, error: "Hodnocení neexistuje." };

  // Ověření přístupu učitele ke skupině.
  try {
    await requireTeacherClassGroupAccess(user, assessment.classGroupId);
  } catch {
    return { ok: false, error: "Nemáte oprávnění k této skupině." };
  }

  // Student musí mít AKTIVNÍ enrollment ve skupině daného assessmentu pro
  // jeho školní rok (ne podle denormalizovaného Student.classGroupId).
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId,
      schoolYearId: assessment.schoolYearId,
      classGroupId: assessment.classGroupId,
      status: "ACTIVE",
    },
  });
  if (!enrollment) {
    return { ok: false, error: "Student nepatří do této skupiny." };
  }

  const discipline = await prisma.discipline.findUnique({
    where: { id: disciplineId },
    include: { scoringRules: true },
  });
  if (!discipline) return { ok: false, error: "Disciplína neexistuje." };

  const numericValue = parsePerformanceValue(rawValue, discipline.valueType);
  const points = calculatePoints(discipline, numericValue);

  const existing = await prisma.result.findUnique({
    where: {
      assessmentId_studentId_disciplineId: {
        assessmentId,
        studentId,
        disciplineId,
      },
    },
  });

  const saved = await prisma.result.upsert({
    where: {
      assessmentId_studentId_disciplineId: {
        assessmentId,
        studentId,
        disciplineId,
      },
    },
    update: {
      rawValue: rawValue ?? null,
      numericValue,
      points,
      updatedByUserId: user.id,
    },
    create: {
      assessmentId,
      studentId,
      disciplineId,
      rawValue: rawValue ?? null,
      numericValue,
      points,
      updatedByUserId: user.id,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "RESULT_UPDATE",
    entityType: "Result",
    entityId: saved.id,
    oldValue: existing
      ? {
          rawValue: existing.rawValue,
          numericValue: existing.numericValue,
          points: existing.points,
        }
      : null,
    newValue: {
      rawValue: saved.rawValue,
      numericValue: saved.numericValue,
      points: saved.points,
    },
    metadata: {
      studentId,
      disciplineId,
      assessmentId,
      assessmentType: assessment.assessmentType,
      classGroupId: assessment.classGroupId,
    },
  });

  // Historie výkonů (vývoj žáka). Duplicitní hodnotu neukládáme.
  const lastHistory = await prisma.resultHistory.findFirst({
    where: { studentId, disciplineId, assessmentId },
    orderBy: { recordedAt: "desc" },
  });
  const sameAsLast =
    lastHistory && (lastHistory.rawValue ?? null) === (saved.rawValue ?? null);
  if (!sameAsLast) {
    await prisma.resultHistory.create({
      data: {
        resultId: saved.id,
        assessmentId,
        studentId,
        disciplineId,
        rawValue: saved.rawValue,
        numericValue: saved.numericValue,
        points: saved.points,
        recordedById: user.id,
      },
    });
  }

  // Přepočet souhrnu studenta v rámci celého assessmentu.
  const [allResults, gradeRules] = await Promise.all([
    prisma.result.findMany({ where: { assessmentId, studentId } }),
    getGradeRules(assessment.assessmentType),
  ]);
  const totalPoints = calculateTotalPoints(allResults);
  const grade = calculateGrade(totalPoints, gradeRules);

  return {
    ok: true,
    rawValue: saved.rawValue ?? "",
    points,
    totalPoints,
    grade,
  };
}
