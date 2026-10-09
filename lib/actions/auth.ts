"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, getCurrentSession, logout } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validators/auth";

export type LoginState = { error?: string };

const roleHome: Record<string, string> = {
  TEACHER: "/ucitel",
  STUDENT: "/zak",
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });

  if (!parsed.success) {
    return { error: "Neplatný vstup. Zkontrolujte zadané údaje." };
  }

  const { identifier, password, rememberMe } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });

  // Stejná chybová hláška pro neexistujícího uživatele i špatné heslo.
  if (!user || !user.isActive) {
    return { error: "Nesprávné přihlašovací údaje." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Nesprávné přihlašovací údaje." };
  }

  const hdrs = await headers();
  await createSession(user.id, rememberMe, {
    userAgent: hdrs.get("user-agent"),
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
  });

  // Vynucená změna hesla (první přihlášení žáka / po resetu).
  if (user.mustChangePassword) {
    await writeAudit({
      userId: user.id,
      action: "PASSWORD_CHANGE_REQUIRED",
      entityType: "User",
      entityId: user.id,
      metadata: { userId: user.id, role: user.role },
    });
    redirect("/zmena-hesla");
  }

  redirect(roleHome[user.role] ?? "/prihlaseni");
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await writeAudit({
      userId: session.user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: session.user.id,
    });
  }
  await logout();
  redirect("/prihlaseni");
}
