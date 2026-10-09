import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { EmptyState } from "@/components/ui/states";
import { StudentAttendanceView } from "@/components/tables/student-attendance-view";
import { getStudentContext } from "@/lib/data/student";
import { getStudentAttendance } from "@/lib/data/attendance";

export default async function StudentAttendancePage() {
  const user = await requireRole("STUDENT");
  const ctx = await getStudentContext(user.id);
  if (!ctx?.student) return <EmptyState title="Profil studenta nenalezen" />;

  const data = await getStudentAttendance(ctx.student.id, ctx.activeTerm?.id);

  return (
    <div>
      <PageHeader
        title="Docházka"
        description={`${ctx.activeTerm?.name ?? ""} · ${ctx.schoolYear?.name ?? ""}`}
        action={<RefreshButton />}
      />
      <StudentAttendanceView
        lessons={data.lessons}
        records={data.records}
        codes={data.codes}
        percentage={data.percentage}
        attendedUnits={data.attendedUnits}
        countedUnits={data.countedUnits}
      />
    </div>
  );
}
