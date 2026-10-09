"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { requireUser, roleHomePath } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { changePasswordSchema } from "@/lib/validators/password";

export type ChangePasswordState = { error?: string };

/**
 * Změna vlastního hesla. Po úspěchu zruší příznak mustChangePassword
 * a přesměruje na dashboard podle role. Heslo se NIKDY neloguje.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
    oldValue: { mustChangePassword: true },
    newValue: { mustChangePassword: false },
    metadata: { userId: user.id, role: user.role },
  });

  redirect(roleHomePath(user.role));
}
