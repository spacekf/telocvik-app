import Link from "next/link";
import { ClipboardList, TrendingUp, CalendarCheck } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { StatCard } from "@/components/dashboard/stat-card";
import { StudentSummaryCard } from "@/components/dashboard/student-summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PointsBadge } from "@/components/ui/points-badge";
import { EmptyState } from "@/components/ui/states";
import { getStudentContext, getStudentRecentChanges } from "@/lib/data/student";
import { getStudentResults } from "@/lib/data/results";
import { getStudentAttendance } from "@/lib/data/attendance";
import { getStudentProgress } from "@/lib/data/progress";

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");
  const ctx = await getStudentContext(user.id);

  if (!ctx?.student) {
    return (
      <EmptyState
        title="Profil studenta nenalezen"
        description="K vašemu účtu zatím není přiřazen studentský profil. Kontaktujte administrátora."
      />
    );
  }

  const termId = ctx.activeTerm?.id;
  const [athletics, fitness, attendance, recent, progress] = await Promise.all([
    getStudentResults(ctx.student.id, "ATHLETICS", termId),
    getStudentResults(ctx.student.id, "FITNESS", termId),
    getStudentAttendance(ctx.student.id, termId),
    getStudentRecentChanges(ctx.student.id),
    getStudentProgress(ctx.student.id),
  ]);
  const improved = progress.find((d) => d.improvement === "UP");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${ctx.student.firstName} ${ctx.student.lastName}`}
        description={`${ctx.classGroup?.name ?? "Bez skupiny"} · ${ctx.schoolYear?.name ?? ""} · ${ctx.activeTerm?.name ?? ""}`}
        action={<RefreshButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StudentSummaryCard
          title="Atletika"
          totalPoints={athletics.totalPoints}
          grade={athletics.grade}
        />
        <StudentSummaryCard
          title="Fyzická zdatnost"
          totalPoints={fitness.totalPoints}
          grade={fitness.grade}
        />
        <StatCard
          label="Docházka"
          value={attendance.countedUnits === 0 ? "bez dat" : `${attendance.percentage} %`}
          hint={
            attendance.countedUnits === 0
              ? "Zatím bez záznamů"
              : `Splněno ${attendance.attendedUnits}/${attendance.countedUnits} h`
          }
          icon={CalendarCheck}
          tone="info"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/zak/vyvoj" className="group">
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Vývoj výkonů</p>
                <p className="truncate text-sm text-muted-foreground">
                  {improved
                    ? `Poslední zlepšení: ${improved.name} (${improved.deltaLabel})`
                    : "Sleduj svůj pokrok"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/zak/bodovani" className="group">
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Tabulky hodnocení</p>
                <p className="truncate text-sm text-muted-foreground">
                  Body za výkon a pravidla známkování
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslední změny</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné záznamy.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{r.discipline}</span>{" "}
                    <span className="text-muted-foreground">
                      ({r.type === "ATHLETICS" ? "atletika" : "fyzická zdatnost"})
                    </span>
                    {r.rawValue ? ` – ${r.rawValue}` : ""}
                  </span>
                  <PointsBadge points={r.points} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
