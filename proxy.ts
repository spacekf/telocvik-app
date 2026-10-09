import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/**
 * Proxy (dřív "middleware" – Next.js 16 konvenci přejmenoval).
 * Hrubá ochrana cest: bez session cookie přesměruj na /prihlaseni.
 * Detailní ověření role + platnosti session probíhá v server layoutech
 * (requireRole) – tam je dostupná databáze.
 */
const PROTECTED_PREFIXES = ["/zak", "/ucitel", "/zmena-hesla"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/prihlaseni";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/zak/:path*", "/ucitel/:path*", "/zmena-hesla"],
};
