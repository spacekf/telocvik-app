import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";

/**
 * Vlastní 404 stránka v PrimMat stylu. Tlačítko vede na dashboard podle role:
 * STUDENT → /zak, TEACHER → /ucitel, nepřihlášený → /prihlaseni.
 * Zjištění uživatele je obaleno try/catch, aby stránka nikdy nespadla.
 */
async function getHomeHref(): Promise<{ href: string; label: string }> {
  try {
    const user = await getCurrentUser();
    if (user?.role === "TEACHER") {
      return { href: "/ucitel", label: "Zpět na přehled" };
    }
    if (user?.role === "STUDENT") {
      return { href: "/zak", label: "Zpět na přehled" };
    }
  } catch {
    // Fallback níže.
  }
  return { href: "/prihlaseni", label: "Zpět na přihlášení" };
}

export default async function NotFound() {
  const { href, label } = await getHomeHref();

  return (
    <div className="brand-dark flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <BrandLogo className="mx-auto w-[160px] sm:w-[200px]" priority />

        <p className="text-6xl font-extrabold tracking-tight text-brand-accent sm:text-7xl">
          404
        </p>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-brand-text sm:text-2xl">
            Tahle stránka neexistuje nebo k ní nemáte přístup.
          </h1>
          <p className="text-sm text-brand-muted sm:text-base">
            Vraťte se prosím zpět do svého přehledu.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </div>
  );
}
