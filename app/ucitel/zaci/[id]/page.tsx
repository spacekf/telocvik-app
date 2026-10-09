import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getActiveSchoolYear } from "@/lib/data/common";
import { getActiveEnrollment } from "@/lib/data/enrollment";
import { getStudentResults } from "@/lib/data/results";
import { getStudentAttendance } from "@/lib/data/attendance";
import { getStudentProgress } from "@/lib/data/progress";
import { ProgressView } from "@/components/student/progress-view";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentResultsView } from "@/components/tables/student-results-view";
import { StudentAttendanceView } from "@/components/tables/student-attendance-view";
import { ResetPasswordButton } from "@/components/teacher/reset-password-button";
import { StudentProfileForm } from "@/components/teacher/student-profile-form";
import { StudentEnrollmentForm } from "@/components/teacher/student-enrollment-form";
import { StudentAccountToggle } from "@/components/teacher/student-account-toggle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("TEACHER");
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!student) notFound();

  const [enrollment, activeYear] = await Promise.all([
    getActiveEnrollment(student.id),
    getActiveSchoolYear(),
  ]);
  const schoolYear = enrollment?.classGroup.schoolYear ?? activeYear;

  // Skupiny aktivního roku odpovídajícího pohlaví (pro přeřazení).
  const groups = schoolYear
    ? await prisma.classGroup.findMany({
        where: { schoolYearId: schoolYear.id, gender: student.gender },
        orderBy: [{ gradeYear: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      })
    : [];

  const [athletics, fitness, attendance, progress] = await Promise.all([
    getStudentResults(student.id, "ATHLETICS"),
    getStudentResults(student.id, "FITNESS"),
    getStudentAttendance(student.id),
    getStudentProgress(student.id),
  ]);

  const hasAccount = Boolean(student.user);
  const mustChange = student.user?.mustChangePassword ?? false;
  const currentGroupName = enrollment?.classGroup.name ?? null;

  return (
    <div className="space-y-4">
      <Link
        href="/ucitel/zaci"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zpět na studenty
      </Link>

      <PageHeader
        title={`${student.lastName} ${student.firstName}`}
        description={`${currentGroupName ?? "Bez skupiny"} · ${schoolYear?.name ?? ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!hasAccount ? (
              <Badge variant="muted">Bez účtu</Badge>
            ) : (
              <>
                {student.user?.isActive ? (
                  <Badge variant="success">
                    <CheckCircle2 />
                    Aktivní
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle />
                    Neaktivní
                  </Badge>
                )}
                {mustChange ? (
                  <Badge variant="warning">
                    <Clock />
                    Čeká na změnu hesla
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <CheckCircle2 />
                    Heslo nastaveno
                  </Badge>
                )}
              </>
            )}
            <RefreshButton iconOnly />
          </div>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="group">Skupina</TabsTrigger>
          <TabsTrigger value="athletics">Atletika</TabsTrigger>
          <TabsTrigger value="fitness">Fyzická zdatnost</TabsTrigger>
          <TabsTrigger value="attendance">Docházka</TabsTrigger>
          <TabsTrigger value="progress">Vývoj</TabsTrigger>
          <TabsTrigger value="security">Bezpečnost</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profil žáka</CardTitle>
            </CardHeader>
            <CardContent>
              {hasAccount && student.user ? (
                <StudentProfileForm
                  studentId={student.id}
                  initial={{
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.user.email,
                    username: student.user.username,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Žák nemá přiřazený uživatelský účet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zařazení do skupiny</CardTitle>
            </CardHeader>
            <CardContent>
              {schoolYear ? (
                <StudentEnrollmentForm
                  studentId={student.id}
                  schoolYearId={schoolYear.id}
                  schoolYearName={schoolYear.name}
                  currentGroupId={enrollment?.classGroupId ?? null}
                  currentGroupName={currentGroupName}
                  groups={groups}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Není nastaven aktivní školní rok.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="athletics">
          <StudentResultsView
            items={athletics.items}
            totalPoints={athletics.totalPoints}
            grade={athletics.grade}
          />
          <Link
            href="/ucitel/vysledky/atletika"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Otevřít tabulku atletiky →
          </Link>
        </TabsContent>

        <TabsContent value="fitness">
          <StudentResultsView
            items={fitness.items}
            totalPoints={fitness.totalPoints}
            grade={fitness.grade}
          />
          <Link
            href="/ucitel/vysledky/zdatnost"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Otevřít tabulku fyzické zdatnosti →
          </Link>
        </TabsContent>

        <TabsContent value="attendance">
          <StudentAttendanceView
            lessons={attendance.lessons}
            records={attendance.records}
            codes={attendance.codes}
            percentage={attendance.percentage}
            attendedUnits={attendance.attendedUnits}
            countedUnits={attendance.countedUnits}
          />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressView disciplines={progress} />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bezpečnost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {hasAccount ? (
                <>
                  <StudentAccountToggle
                    studentId={student.id}
                    isActive={student.user?.isActive ?? false}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Stav hesla:</span>
                      {mustChange ? (
                        <Badge variant="destructive">Čeká na změnu hesla</Badge>
                      ) : (
                        <Badge variant="secondary">Heslo nastaveno</Badge>
                      )}
                    </div>
                    <ResetPasswordButton studentId={student.id} />
                    <p className="text-xs text-muted-foreground">
                      Reset nastaví výchozí heslo Heslo123. a vynutí jeho změnu při
                      dalším přihlášení.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Žák nemá přiřazený uživatelský účet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
