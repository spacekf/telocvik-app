"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV_BY_ROLE, type NavItem, type NavSection } from "./nav-config";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils/cn";

const ROOT_HREFS = ["/zak", "/ucitel"];

/**
 * Aktivní položka = nejdelší href, který odpovídá pathname (přesně, nebo jako
 * prefix po segmentech). Díky tomu se na /ucitel/skolni-roky/prevod nezvýrazní
 * zároveň "Školní roky". Kořenové přehledy (/zak, /ucitel) jen při přesné shodě.
 */
function findActiveHref(pathname: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const { href } of section.items) {
      const matches =
        pathname === href ||
        (!ROOT_HREFS.includes(href) && pathname.startsWith(`${href}/`));
      if (matches && (best === null || href.length > best.length)) best = href;
    }
  }
  return best;
}

export function Sidebar({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = NAV_BY_ROLE[role];
  const activeHref = findActiveHref(pathname, sections);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-white/10 px-5 py-5">
        <BrandLogo className="h-8 w-auto" />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <SidebarSection
            key={section.label ?? i}
            section={section}
            activeHref={activeHref}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[11px] text-brand-muted">PrimMat · Tělocvik</p>
      </div>
    </div>
  );
}

function SidebarSection({
  section,
  activeHref,
  onNavigate,
}: {
  section: NavSection;
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  const listId = useId();
  const containsActive = section.items.some((item) => item.href === activeHref);

  // Sbalitelná sekce je výchozí sbalená; rozbalí se, pokud je v ní aktivní
  // stránka (při načtení i při navigaci do ní – desktop sidebar se nepřemontuje).
  const [open, setOpen] = useState(containsActive);
  const [prevContainsActive, setPrevContainsActive] = useState(containsActive);
  if (containsActive !== prevContainsActive) {
    setPrevContainsActive(containsActive);
    if (containsActive) setOpen(true);
  }

  const expanded = !section.collapsible || open;
  const headingClass =
    "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted/70";

  return (
    <div className={cn("flex flex-col gap-0.5", section.label && "mt-4")}>
      {section.label &&
        (section.collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={listId}
            className={cn(
              headingClass,
              "flex items-center justify-between rounded-md pt-1 text-left transition-colors hover:text-brand-text",
            )}
          >
            {section.label}
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <p className={headingClass}>{section.label}</p>
        ))}
      {expanded && (
        <div id={listId} className="flex flex-col gap-0.5">
          {section.items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={item.href === activeHref}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-accent text-[#17143A] shadow-sm"
          : "text-brand-muted hover:bg-white/10 hover:text-brand-text",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#17143A]/70" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-[#17143A]" : "text-brand-muted group-hover:text-brand-text",
        )}
      />
      {item.label}
    </Link>
  );
}
