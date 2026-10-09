import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Centrální permission helpery. Žádné role checky rozházené po UI –
 * vždy se ptáme přes tyto funkce.
 */

/**
 * Učitel je správcovská role – má přístup ke všem skupinám.
 * (Parametr classGroupId ponecháváme pro kompatibilitu a budoucí zúžení práv.)
 */
export async function canTeacherAccessClassGroup(
  user: SessionUser,
  _classGroupId: string,
): Promise<boolean> {
  return user.role === "TEACHER";
}

/** Student smí číst pouze data svého vlastního Student profilu. Učitel vždy. */
export async function canStudentAccessStudentData(
  user: SessionUser,
  studentId: string,
): Promise<boolean> {
  if (user.role === "TEACHER") return true;
  if (user.role !== "STUDENT") return false;

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return Boolean(student && student.id === studentId);
}

/** Vyhodí chybu, pokud učitel nemá ke skupině přístup. */
export async function requireTeacherClassGroupAccess(
  user: SessionUser,
  classGroupId: string,
): Promise<void> {
  const ok = await canTeacherAccessClassGroup(user, classGroupId);
  if (!ok) {
    throw new Error("Nemáte oprávnění k této skupině.");
  }
}

/** Vrátí Student profil přihlášeného studenta, jinak null. */
export async function getOwnStudentId(
  user: SessionUser,
): Promise<string | null> {
  if (user.role !== "STUDENT") return null;
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return student?.id ?? null;
}

/** Vrátí Teacher profil přihlášeného učitele, jinak null. */
export async function getOwnTeacherId(
  user: SessionUser,
): Promise<string | null> {
  if (user.role !== "TEACHER") return null;
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return teacher?.id ?? null;
}
