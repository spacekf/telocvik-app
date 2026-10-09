import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/states";
import { StudentResultsView } from "@/components/tables/student-results-view";
import { getStudentContext } from "@/lib/data/student";
import { getStudentResults } from "@/lib/data/results";

export default async function StudentAthletics() {
  const user = await requireRole("STUDENT");
  const ctx = await getStudentContext(user.id);
  if (!ctx?.student) return <EmptyState title="Profil studenta nenalezen" />;

  const data = await getStudentResults(
    ctx.student.id,
    "ATHLETICS",
    ctx.activeTerm?.id,
  );

  return (
    <div>
      <PageHeader
        title="Atletika"
        description={`${ctx.activeTerm?.name ?? ""} · ${ctx.schoolYear?.name ?? ""}`}
      />
      <StudentResultsView
        items={data.items}
        totalPoints={data.totalPoints}
        grade={data.grade}
      />
    </div>
  );
}
