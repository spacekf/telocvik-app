"use client";

import { LogOut, Menu } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABEL } from "./nav-config";

export function Topbar({
  username,
  role,
  onMenuClick,
}: {
  username: string;
  role: Role;
  onMenuClick?: () => void;
}) {
  return (
    <header className="brand-dark sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-brand-text hover:bg-white/10 md:hidden"
          onClick={onMenuClick}
          aria-label="Otevřít menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-brand-text">
            {username.slice(0, 2).toUpperCase()}
          </span>
          <div className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium text-brand-text">
              {username}
            </span>
            <span className="block text-[11px] text-brand-muted">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <Badge className="bg-white/15 text-brand-text sm:hidden">
          {ROLE_LABEL[role]}
        </Badge>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-brand-text hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Odhlásit</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
