import { requireRole } from "@/lib/auth/session";
import { getOwnStudentId } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { EmptyState } from "@/components/ui/states";
import { ProgressView } from "@/components/student/progress-view";
import { getStudentProgress } from "@/lib/data/progress";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const user = await requireRole("STUDENT");
  // Student vidí jen vlastní vývoj.
  const studentId = await getOwnStudentId(user);
  if (!studentId) return <EmptyState title="Profil studenta nenalezen" />;

  const disciplines = await getStudentProgress(studentId);

  return (
    <div>
      <PageHeader
        title="Vývoj výkonů"
        description="Jak se tvé výkony mění v čase."
        action={<RefreshButton />}
      />
      <ProgressView disciplines={disciplines} />
    </div>
  );
}
