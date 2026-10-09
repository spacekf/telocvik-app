import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "crypto";
import type { Role, User } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

export { SESSION_COOKIE };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** Vygeneruje náhodný session token (vrací se do cookie). */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Token v DB ukládáme pouze jako hash (SHA-256). */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type SessionMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

/**
 * Vytvoří session v DB a nastaví httpOnly cookie.
 * rememberMe=true → 30 dní, jinak 12 hodin.
 */
export async function createSession(
  userId: string,
  rememberMe: boolean,
  meta: SessionMeta = {},
): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const maxAgeMs = rememberMe ? THIRTY_DAYS_MS : TWELVE_HOURS_MS;
  const expiresAt = new Date(Date.now() + maxAgeMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "username" | "role" | "isActive" | "mustChangePassword"
>;

/** Načte aktuální session z cookie + ověří platnost v DB. */
export async function getCurrentSession(): Promise<{
  sessionId: string;
  user: SessionUser;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  return { sessionId: session.id, user: session.user };
}

/** Vrátí aktuálního uživatele nebo null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/** Vyžaduje přihlášeného uživatele, jinak redirect na /prihlaseni. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni");
  return user;
}

/** Domovský dashboard podle role. */
export function roleHomePath(role: Role): string {
  return role === "TEACHER" ? "/ucitel" : "/zak";
}

/**
 * Vyžaduje konkrétní roli (nebo více rolí). Pokud uživatel roli nemá,
 * bezpečně ho přesměruje na jeho vlastní dashboard (ne na cizí obsah).
 */
export async function requireRole(
  roles: Role | Role[],
): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    redirect(roleHomePath(user.role));
  }
  return user;
}

/** Odhlášení – smaže session z DB i cookie. */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
