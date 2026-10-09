"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Gender } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/auth/default-password";
import { writeAudit } from "@/lib/audit";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { ensureEnrollment } from "@/lib/data/enrollment";
import {
  STUDENT_EMAIL_DOMAIN,
  findFreeStudentHandle,
  generateStudentHandle,
} from "@/lib/students/generate-student-email";
import {
  createUserSchema,
  createStudentAutoSchema,
  createStudentsBulkSchema,
  updateUserSchema,
  createClassGroupSchema,
} from "@/lib/validators/admin";

export type AdminResult = { ok: boolean; error?: string };

export async function createUser(input: unknown): Promise<AdminResult> {
  const admin = await requireRole("TEACHER");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const d = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: d.email.toLowerCase() }, { username: d.username }] },
  });
  if (existing) {
    return { ok: false, error: "E-mail nebo uživatelské jméno již existuje." };
  }

  const passwordHash = await hashPassword(d.password);

  const user = await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      username: d.username,
      passwordHash,
      role: d.role,
      // Žák si po prvním přihlášení musí nastavit vlastní heslo.
      mustChangePassword: d.role === "STUDENT",
    },
  });

  if (d.role === "STUDENT") {
    const newStudent = await prisma.student.create({
      data: {
        userId: user.id,
        firstName: d.firstName!,
        lastName: d.lastName!,
        gender: d.gender!,
        classGroupId: d.classGroupId || null,
      },
    });
    // Zařazení žáka do skupiny pro daný školní rok (enrollment).
    if (d.classGroupId) {
      const group = await prisma.classGroup.findUnique({
        where: { id: d.classGroupId },
        select: { schoolYearId: true },
      });
      if (group) {
        await ensureEnrollment({
          studentId: newStudent.id,
          classGroupId: d.classGroupId,
          schoolYearId: group.schoolYearId,
        });
      }
    }
  } else if (d.role === "TEACHER") {
    await prisma.teacher.create({
      data: { userId: user.id, firstName: d.firstName!, lastName: d.lastName! },
    });
  }

  await writeAudit({
    userId: admin.id,
    action: "USER_CREATE",
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, username: user.username, role: user.role },
  });

  revalidatePath("/ucitel/zaci");
  revalidatePath("/ucitel/ucitele");
  return { ok: true };
}

export type CreateStudentAutoResult =
  | { ok: true; email: string; username: string; name: string }
  | { ok: false; error: string };

/**
 * Rychlé založení žáka: učitel zadá jméno, příjmení a skupinu. E-mail
 * a username se vygenerují (spacekf, při kolizi spacekf2, …), heslo je
 * výchozí s povinnou změnou, pohlaví se převezme ze skupiny.
 */
export async function createStudentAuto(
  input: unknown,
): Promise<CreateStudentAutoResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = createStudentAutoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { firstName, lastName, classGroupId } = parsed.data;

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: { schoolYearId: true, gender: true },
  });
  if (!group) return { ok: false, error: "Skupina neexistuje." };

  const base = generateStudentHandle(firstName, lastName);
  if (!base) return { ok: false, error: "Neplatné jméno žáka." };

  const isTaken = async (handle: string) =>
    (await prisma.user.findFirst({
      where: {
        OR: [{ email: `${handle}@${STUDENT_EMAIL_DOMAIN}` }, { username: handle }],
      },
      select: { id: true },
    })) !== null;

  const passwordHash = await hashPassword(DEFAULT_STUDENT_PASSWORD);

  // Mezi hledáním volného handle a zápisem ho může obsadit souběžný požadavek
  // (unikátní index vyhodí P2002) – pak hledáme znovu.
  let created: { userId: string; studentId: string; email: string; username: string } | null =
    null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const handle = await findFreeStudentHandle(base, isTaken);
    if (!handle) return { ok: false, error: "Nepodařilo se najít volný e-mail žáka." };
    const email = `${handle}@${STUDENT_EMAIL_DOMAIN}`;
    try {
      created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            username: handle,
            passwordHash,
            role: "STUDENT",
            mustChangePassword: true,
          },
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            gender: group.gender,
            classGroupId,
          },
        });
        return { userId: user.id, studentId: student.id, email, username: handle };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  if (!created) return { ok: false, error: "Nepodařilo se najít volný e-mail žáka." };

  await ensureEnrollment({
    studentId: created.studentId,
    classGroupId,
    schoolYearId: group.schoolYearId,
  });

  await writeAudit({
    userId: teacher.id,
    action: "USER_CREATE",
    entityType: "User",
    entityId: created.userId,
    newValue: { email: created.email, username: created.username, role: "STUDENT" },
  });

  revalidatePath("/ucitel/zaci");
  return {
    ok: true,
    email: created.email,
    username: created.username,
    name: `${lastName} ${firstName}`,
  };
}

export type CreateStudentsBulkResult =
  | {
      ok: true;
      created: { name: string; email: string; username: string }[];
      failed: { name: string; reason: string }[];
    }
  | { ok: false; error: string };

/**
 * Hromadné založení žáků do JEDNÉ skupiny. Žáci se zakládají postupně, takže
 * jmenovci uvnitř dávky dostanou různá čísla (další žák už vidí zápis
 * předchozího). Chyba u jednoho žáka dávku neshodí – skončí v `failed`.
 */
export async function createStudentsBulk(
  input: unknown,
): Promise<CreateStudentsBulkResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = createStudentsBulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }
  const { classGroupId, students } = parsed.data;

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: { schoolYearId: true, gender: true },
  });
  if (!group) return { ok: false, error: "Skupina neexistuje." };

  // Hash se počítá jednou pro celou dávku (všichni mají výchozí heslo).
  const passwordHash = await hashPassword(DEFAULT_STUDENT_PASSWORD);

  const created: { name: string; email: string; username: string }[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const { firstName, lastName } of students) {
    const name = `${lastName} ${firstName}`;
    try {
      const one = await createOneStudent({
        firstName,
        lastName,
        classGroupId,
        group,
        passwordHash,
        teacherId: teacher.id,
      });
      if (one.ok) created.push({ name, email: one.email, username: one.username });
      else failed.push({ name, reason: one.error });
    } catch {
      failed.push({ name, reason: "Žáka se nepodařilo založit." });
    }
  }

  revalidatePath("/ucitel/zaci");
  return { ok: true, created, failed };
}

/**
 * Založí jednoho žáka s vygenerovaným handle (User + Student + zařazení +
 * audit). Stejná pravidla jako createStudentAuto, jen bez vlastní autorizace
 * a revalidace – ty řeší volající dávka.
 */
async function createOneStudent(params: {
  firstName: string;
  lastName: string;
  classGroupId: string;
  group: { schoolYearId: string; gender: Gender };
  passwordHash: string;
  teacherId: string;
}): Promise<{ ok: true; email: string; username: string } | { ok: false; error: string }> {
  const { firstName, lastName, classGroupId, group, passwordHash, teacherId } = params;

  const base = generateStudentHandle(firstName, lastName);
  if (!base) return { ok: false, error: "Neplatné jméno žáka." };

  const isTaken = async (handle: string) =>
    (await prisma.user.findFirst({
      where: {
        OR: [{ email: `${handle}@${STUDENT_EMAIL_DOMAIN}` }, { username: handle }],
      },
      select: { id: true },
    })) !== null;

  // Souběžný zápis může handle obsadit mezi hledáním a create (P2002) – zkus znovu.
  let made: { userId: string; studentId: string; email: string; username: string } | null =
    null;
  for (let attempt = 0; attempt < 3 && !made; attempt++) {
    const handle = await findFreeStudentHandle(base, isTaken);
    if (!handle) return { ok: false, error: "Nepodařilo se najít volný e-mail žáka." };
    const email = `${handle}@${STUDENT_EMAIL_DOMAIN}`;
    try {
      made = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            username: handle,
            passwordHash,
            role: "STUDENT",
            mustChangePassword: true,
          },
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            gender: group.gender,
            classGroupId,
          },
        });
        return { userId: user.id, studentId: student.id, email, username: handle };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  if (!made) return { ok: false, error: "Nepodařilo se najít volný e-mail žáka." };

  await ensureEnrollment({
    studentId: made.studentId,
    classGroupId,
    schoolYearId: group.schoolYearId,
  });

  await writeAudit({
    userId: teacherId,
    action: "USER_CREATE",
    entityType: "User",
    entityId: made.userId,
    newValue: { email: made.email, username: made.username, role: "STUDENT" },
  });

  return { ok: true, email: made.email, username: made.username };
}

export async function updateUser(input: unknown): Promise<AdminResult> {
  const admin = await requireRole("TEACHER");
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };
  const d = parsed.data;

  const before = await prisma.user.findUnique({ where: { id: d.userId } });
  if (!before) return { ok: false, error: "Uživatel neexistuje." };

  const user = await prisma.user.update({
    where: { id: d.userId },
    data: {
      email: d.email.toLowerCase(),
      username: d.username,
      role: d.role,
      isActive: d.isActive,
    },
  });

  await writeAudit({
    userId: admin.id,
    action: "USER_UPDATE",
    entityType: "User",
    entityId: user.id,
    oldValue: { email: before.email, username: before.username, role: before.role, isActive: before.isActive },
    newValue: { email: user.email, username: user.username, role: user.role, isActive: user.isActive },
  });

  revalidatePath("/ucitel/zaci");
  return { ok: true };
}


export async function createClassGroup(input: unknown): Promise<AdminResult> {
  await requireRole("TEACHER");
  const parsed = createClassGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };
  const d = parsed.data;

  const existing = await prisma.classGroup.findFirst({
    where: { schoolYearId: d.schoolYearId, name: d.name },
  });
  if (existing) return { ok: false, error: "Skupina s tímto názvem už existuje." };

  await prisma.classGroup.create({
    data: {
      name: d.name,
      schoolYearId: d.schoolYearId,
      gradeYear: d.gradeYear,
      gender: d.gender,
    },
  });

  revalidatePath("/ucitel/skupiny");
  return { ok: true };
}

/**
 * Reset hesla žáka učitelem. Nastaví výchozí heslo a vynutí jeho změnu.
 * Učitel může resetovat pouze účty s rolí STUDENT. Heslo se NIKDY neloguje.
 */
export async function resetStudentPassword(
  studentId: string,
): Promise<AdminResult & { message?: string }> {
  const teacher = await requireRole("TEACHER");

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student || !student.user) {
    return { ok: false, error: "Žák nebyl nalezen." };
  }
  if (student.user.role !== "STUDENT") {
    return {
      ok: false,
      error: "Heslo lze tímto způsobem resetovat pouze žákovi.",
    };
  }

  const passwordHash = await hashPassword(DEFAULT_STUDENT_PASSWORD);

  await prisma.user.update({
    where: { id: student.user.id },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordResetAt: new Date(),
    },
  });

  // Zneplatníme existující session žáka.
  await prisma.session.deleteMany({ where: { userId: student.user.id } });

  await createAuditLog({
    userId: teacher.id,
    action: "STUDENT_PASSWORD_RESET",
    entityType: "User",
    entityId: student.user.id,
    oldValue: { mustChangePassword: student.user.mustChangePassword },
    newValue: { mustChangePassword: true },
    metadata: {
      studentId: student.id,
      studentUserId: student.user.id,
      resetByUserId: teacher.id,
    },
  });

  revalidatePath("/ucitel/zaci");
  revalidatePath(`/ucitel/zaci/${student.id}`);
  return {
    ok: true,
    message:
      "Heslo bylo resetováno na Heslo123. Žák si ho po přihlášení musí změnit.",
  };
}
