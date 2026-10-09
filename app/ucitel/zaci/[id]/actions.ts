"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  updateStudentProfileSchema,
  updateStudentEnrollmentSchema,
  toggleStudentActiveSchema,
} from "@/lib/validators/student-profile";

export type StudentActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

/** Úprava profilu žáka: jméno, příjmení, e-mail, username. */
export async function updateStudentProfile(
  input: unknown,
): Promise<StudentActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = updateStudentProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { studentId, firstName, lastName, email, username } = parsed.data;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) return { ok: false, error: "Žák nenalezen." };
  if (!student.user) {
    return { ok: false, error: "Žák nemá přiřazený účet." };
  }

  const normalizedEmail = email.toLowerCase();

  // E-mail i username musí být unikátní (mimo tohoto uživatele).
  const emailClash = await prisma.user.findFirst({
    where: { email: normalizedEmail, NOT: { id: student.user.id } },
    select: { id: true },
  });
  if (emailClash) {
    return { ok: false, error: "Tento e-mail už používá jiný uživatel." };
  }
  const usernameClash = await prisma.user.findFirst({
    where: { username, NOT: { id: student.user.id } },
    select: { id: true },
  });
  if (usernameClash) {
    return { ok: false, error: "Toto uživatelské jméno už používá jiný uživatel." };
  }

  const oldValue = {
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.user.email,
    username: student.user.username,
  };

  await prisma.student.update({
    where: { id: studentId },
    data: { firstName, lastName },
  });
  await prisma.user.update({
    where: { id: student.user.id },
    data: { email: normalizedEmail, username },
  });

  await createAuditLog({
    userId: teacher.id,
    action: "STUDENT_PROFILE_UPDATED",
    entityType: "Student",
    entityId: studentId,
    oldValue,
    newValue: { firstName, lastName, email: normalizedEmail, username },
    metadata: { studentId, studentUserId: student.user.id, changedByUserId: teacher.id },
  });

  revalidatePath(`/ucitel/zaci/${studentId}`);
  revalidatePath("/ucitel/zaci");
  return { ok: true, message: "Profil uložen." };
}

/** Zapnutí/vypnutí účtu žáka. */
export async function toggleStudentActive(
  input: unknown,
): Promise<StudentActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = toggleStudentActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };
  const { studentId, isActive } = parsed.data;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student?.user) return { ok: false, error: "Žák nemá přiřazený účet." };

  await prisma.user.update({
    where: { id: student.user.id },
    data: { isActive },
  });
  // Při deaktivaci zneplatníme i přihlášení.
  if (!isActive) {
    await prisma.session.deleteMany({ where: { userId: student.user.id } });
  }

  await createAuditLog({
    userId: teacher.id,
    action: "STUDENT_ACCOUNT_STATUS_UPDATED",
    entityType: "Student",
    entityId: studentId,
    oldValue: { isActive: student.user.isActive },
    newValue: { isActive },
    metadata: { studentId, studentUserId: student.user.id, changedByUserId: teacher.id },
  });

  revalidatePath(`/ucitel/zaci/${studentId}`);
  revalidatePath("/ucitel/zaci");
  return { ok: true, message: isActive ? "Účet aktivován." : "Účet deaktivován." };
}

/**
 * Změna skupiny žáka pro konkrétní školní rok (přes StudentEnrollment).
 * Mění JEN enrollment daného roku – historická data zůstávají nedotčená.
 */
export async function updateStudentEnrollment(
  input: unknown,
): Promise<StudentActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = updateStudentEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { studentId, schoolYearId, newClassGroupId } = parsed.data;

  const targetGroup = await prisma.classGroup.findUnique({
    where: { id: newClassGroupId },
  });
  if (!targetGroup) return { ok: false, error: "Cílová skupina neexistuje." };
  if (targetGroup.schoolYearId !== schoolYearId) {
    return { ok: false, error: "Skupina nepatří do vybraného školního roku." };
  }

  const existing = await prisma.studentEnrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    include: { classGroup: true },
  });

  if (existing && existing.classGroupId === newClassGroupId) {
    return { ok: true, message: "Žák už v této skupině je." };
  }

  const oldValue = existing
    ? {
        classGroupId: existing.classGroupId,
        classGroupName: existing.classGroup.name,
      }
    : { classGroupId: null, classGroupName: null };

  await prisma.studentEnrollment.upsert({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    update: { classGroupId: newClassGroupId, status: "ACTIVE" },
    create: {
      studentId,
      classGroupId: newClassGroupId,
      schoolYearId,
      status: "ACTIVE",
    },
  });

  // Synchronizace denormalizovaného "aktuálního" zařazení, jen pro aktivní rok.
  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (activeYear?.id === schoolYearId) {
    await prisma.student.update({
      where: { id: studentId },
      data: { classGroupId: newClassGroupId },
    });
  }

  await createAuditLog({
    userId: teacher.id,
    action: "STUDENT_ENROLLMENT_UPDATED",
    entityType: "StudentEnrollment",
    entityId: studentId,
    oldValue,
    newValue: {
      classGroupId: newClassGroupId,
      classGroupName: targetGroup.name,
    },
    metadata: { studentId, schoolYearId, changedByUserId: teacher.id },
  });

  revalidatePath(`/ucitel/zaci/${studentId}`);
  revalidatePath("/ucitel/zaci");
  return { ok: true, message: `Skupina změněna na ${targetGroup.name}.` };
}
