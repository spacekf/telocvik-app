import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getAccessibleClassGroups, getActiveSchoolYear } from "@/lib/data/common";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { StudentSearch } from "@/components/teacher/student-search";
import { CreateStudentDialog } from "@/components/teacher/create-student-dialog";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherStudents({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole("TEACHER");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const activeYear = await getActiveSchoolYear();
  const groups = activeYear
    ? await getAccessibleClassGroups(user, activeYear.id)
    : [];
  const groupIds = groups.map((g) => g.id);

  const selectedGroup =
    sp.classGroupId && groupIds.includes(sp.classGroupId)
      ? sp.classGroupId
      : undefined;

  const studentWhere: Prisma.StudentWhereInput | undefined = q
    ? {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { user: { email: { contains: q } } },
        ],
      }
    : undefined;

  const enrollments =
    activeYear && groupIds.length
      ? await prisma.studentEnrollment.findMany({
          where: {
            schoolYearId: activeYear.id,
            classGroupId: selectedGroup ? selectedGroup : { in: groupIds },
            student: studentWhere,
          },
          include: {
            student: { include: { user: true } },
            classGroup: true,
          },
          orderBy: [
            { student: { lastName: "asc" } },
            { student: { firstName: "asc" } },
          ],
        })
      : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Žáci"
        description={`Seznam žáků – ${activeYear?.name ?? "není aktivní rok"}`}
        action={
          <>
            <RefreshButton />
            <CreateStudentDialog
              groups={groups.map((g) => ({ id: g.id, name: g.name }))}
              defaultGroupId={selectedGroup}
            />
            <Button asChild variant="outline">
              <Link href="/ucitel/zaci/hromadne">Přidat hromadně</Link>
            </Button>
          </>
        }
      />

      <StudentSearch />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/ucitel/zaci"
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm",
            !selectedGroup ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
        >
          Vše
        </Link>
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/ucitel/zaci?classGroupId=${g.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              selectedGroup === g.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {enrollments.length === 0 ? (
        <EmptyState title="Žádní žáci" description={q ? "Hledání nevrátilo žádné žáky." : undefined} />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {enrollments.map((e) => {
              const u = e.student.user;
              return (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <Link
                    href={`/ucitel/zaci/${e.student.id}`}
                    className="font-medium hover:underline"
                  >
                    {e.student.lastName} {e.student.firstName}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.classGroup.name}</Badge>
                    {u ? (
                      <>
                        {u.isActive ? (
                          <Badge variant="success">Aktivní</Badge>
                        ) : (
                          <Badge variant="destructive">Neaktivní</Badge>
                        )}
                        {u.mustChangePassword ? (
                          <Badge variant="warning">Čeká na změnu hesla</Badge>
                        ) : (
                          <Badge variant="success">Heslo nastaveno</Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="muted">Bez účtu</Badge>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/ucitel/zaci/${e.student.id}`}>Detail</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
