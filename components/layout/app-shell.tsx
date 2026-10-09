"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils/cn";

/**
 * Hlavní layout přihlášené části: tmavý brand sidebar + světlý pracovní obsah.
 * Na mobilu se sidebar skrývá do vysouvacího menu (hamburger v topbaru).
 */
export function AppShell({
  role,
  username,
  children,
}: {
  role: Role;
  username: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="brand-dark hidden w-64 shrink-0 md:sticky md:top-0 md:block md:h-screen">
        <Sidebar role={role} />
      </aside>

      {/* Mobilní drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="brand-dark absolute left-0 top-0 h-full w-72 max-w-[80%] shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-brand-muted hover:text-brand-text"
              aria-label="Zavřít menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          username={username}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className={cn("flex-1 overflow-x-hidden p-4 md:p-6")}>
          {children}
        </main>
      </div>
    </div>
  );
}
