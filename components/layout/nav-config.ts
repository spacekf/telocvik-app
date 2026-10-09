import {
  LayoutDashboard,
  Activity,
  Dumbbell,
  CalendarCheck,
  Users,
  GraduationCap,
  School,
  CalendarRange,
  Upload,
  ClipboardList,
  History,
  ArrowRightLeft,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  /** Nadpis sekce; undefined = bez nadpisu, vždy zobrazená. */
  label?: string;
  /** true = sekci lze sbalit (výchozí stav sbalená). */
  collapsible?: boolean;
  items: NavItem[];
};

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  STUDENT: [
    {
      items: [
        { href: "/zak", label: "Přehled", icon: LayoutDashboard },
        { href: "/zak/atletika", label: "Atletika", icon: Activity },
        { href: "/zak/zdatnost", label: "Fyzická zdatnost", icon: Dumbbell },
        { href: "/zak/dochazka", label: "Docházka", icon: CalendarCheck },
        { href: "/zak/vyvoj", label: "Vývoj", icon: TrendingUp },
        { href: "/zak/bodovani", label: "Hodnocení", icon: ClipboardList },
      ],
    },
  ],
  TEACHER: [
    {
      // Každodenní práce
      items: [
        { href: "/ucitel", label: "Přehled", icon: LayoutDashboard },
        { href: "/ucitel/vysledky/atletika", label: "Atletika", icon: Activity },
        { href: "/ucitel/vysledky/zdatnost", label: "Fyzická zdatnost", icon: Dumbbell },
        { href: "/ucitel/dochazka", label: "Docházka", icon: CalendarCheck },
        { href: "/ucitel/zaci", label: "Žáci", icon: Users },
      ],
    },
    {
      label: "Správa",
      collapsible: true,
      items: [
        { href: "/ucitel/skupiny", label: "Skupiny", icon: School },
        { href: "/ucitel/skolni-roky", label: "Školní roky", icon: CalendarRange },
        { href: "/ucitel/skolni-roky/prevod", label: "Převod roku", icon: ArrowRightLeft },
        { href: "/ucitel/pololeti", label: "Pololetí", icon: CalendarRange },
        { href: "/ucitel/bodovani", label: "Bodování", icon: ClipboardList },
        { href: "/ucitel/import", label: "Import", icon: Upload },
        { href: "/ucitel/ucitele", label: "Učitelé", icon: GraduationCap },
        { href: "/ucitel/historie", label: "Historie změn", icon: History },
      ],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  TEACHER: "Učitel",
  STUDENT: "Žák",
};
