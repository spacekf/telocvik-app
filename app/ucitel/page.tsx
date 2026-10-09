import Link from "next/link";
import {
  Activity,
  Dumbbell,
  CalendarCheck,
  Users,
  History,
  GraduationCap,
  School,
} from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PointsBadge } from "@/components/ui/points-badge";
import { EmptyState } from "@/components/ui/states";
import { StatCard } from "@/components/dashboard/stat-card";
import { AuditLogTable } from "@/components/tables/audit-log-table";
import { getTeacherDashboard } from "@/lib/data/teacher";
import {
  getRecentAuditLogsForGroups,
  countGroupChangesSince,
} from "@/lib/data/audit";

/** Hlavní denní akce – výrazné karty v první řadě. */
const PRIMARY_LINKS = [
  { href: "/ucitel/vysledky/atletika", label: "Atletika", icon: Activity },
  {
    href: "/ucitel/vysledky/zdatnost",
    label: "Fyzická zdatnost",
    icon: Dumbbell,
  },
  { href: "/ucitel/dochazka", label: "Docházka", icon: CalendarCheck },
];

/** Vedlejší odkazy – méně výrazné. Správa je v menu. */
const SECONDARY_LINKS = [{ href: "/ucitel/zaci", label: "Žáci", icon: Users }];

export default async function TeacherDashboard() {
  const user = await requireRole("TEACHER");
  const data = await getTeacherDashboard(user);

  const groupIds = data.groups.map((g) => g.id);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentLogs, changeCount] = await Promise.all([
    getRecentAuditLogsForGroups(groupIds, 5),
    countGroupChangesSince(groupIds, weekAgo),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Přehled"
        description="Rychlé akce a poslední změny"
        action={<RefreshButton />}
      />

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {PRIMARY_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className="group">
                <Card className="hover:border-brand/30 h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <span className="group-hover:bg-brand-dark flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm transition-colors">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-base font-semibold">{l.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {SECONDARY_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className="group">
                <Card className="hover:border-brand/30 transition-all hover:shadow-sm">
                  <CardContent className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{l.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Změny za 7 dní"
          value={changeCount}
          hint="ve vašich skupinách"
          icon={History}
          tone="info"
        />
        <StatCard
          label="Skupiny"
          value={data.groups.length}
          icon={School}
          tone="default"
        />
        <StatCard
          label="Žáci celkem"
          value={data.groups.reduce((s, g) => s + g.studentCount, 0)}
          icon={GraduationCap}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Moje skupiny</CardTitle>
          </CardHeader>
          <CardContent>
            {data.groups.length === 0 ? (
              <EmptyState
                title="Žádné přiřazené skupiny"
                description="Zatím nemáte přiřazené žádné skupiny. Kontaktujte administrátora."
              />
            ) : (
              <ul className="divide-y">
                {data.groups.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">
                      {g.studentCount} žáků
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Poslední úpravy výsledků
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Zatím žádné úpravy.
              </p>
            ) : (
              <ul className="divide-y">
                {data.recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{r.student}</span> –{" "}
                      {r.discipline}
                      {r.rawValue ? ` (${r.rawValue})` : ""}
                    </span>
                    <PointsBadge points={r.points} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Posledních 5 změn</CardTitle>
          <div className="flex items-center gap-2">
            <RefreshButton iconOnly />
            <Link
              href="/ucitel/historie"
              className="text-sm font-medium text-primary hover:underline"
            >
              Celá historie →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <AuditLogTable rows={recentLogs} />
        </CardContent>
      </Card>
    </div>
  );
}
