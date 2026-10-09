import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { TeacherFilterBar } from "@/components/forms/teacher-filter-bar";
import { ResultsTable } from "@/components/tables/results-table";
import { EmptyState } from "@/components/ui/states";
import { getFilterContext } from "@/lib/data/teacher";
import { getTeacherAssessmentTable } from "@/lib/data/results";

// Vždy dynamicky podle aktuálních searchParams (filtry rok/pololetí/skupina).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherFitness({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole("TEACHER");
  const sp = await searchParams;
  const filter = await getFilterContext(user, sp);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fyzická zdatnost – zápis výsledků"
        description="Editujte výkony, body a známku přepočítá server automaticky."
        action={<RefreshButton />}
      />
      <TeacherFilterBar
        schoolYears={filter.schoolYears}
        terms={filter.terms}
        groups={filter.groups}
        schoolYearId={filter.schoolYearId}
        termId={filter.termId}
        classGroupId={filter.classGroupId}
      />
      {filter.classGroupId && filter.termId ? (
        <ResultsTable
          key={`${filter.schoolYearId}-${filter.termId}-${filter.classGroupId}`}
          table={await getTeacherAssessmentTable(
            filter.classGroupId,
            filter.termId,
            "FITNESS",
          )}
        />
      ) : (
        <EmptyState
          title="Vyberte skupinu"
          description="Pro zobrazení tabulky vyberte školní rok, pololetí a skupinu."
        />
      )}
    </div>
  );
}
