import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { TeacherFilterBar } from "@/components/forms/teacher-filter-bar";
import { AttendanceTable } from "@/components/tables/attendance-table";
import { EmptyState } from "@/components/ui/states";
import { getFilterContext } from "@/lib/data/teacher";
import { getTeacherAttendanceTable } from "@/lib/data/attendance";

// Vždy dynamicky podle aktuálních searchParams (filtry rok/pololetí/skupina).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherAttendance({
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
        title="Docházka"
        description="Klikáním na buňku přepínáte kód. Procento účasti se počítá automaticky."
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
        <AttendanceTable
          key={`${filter.schoolYearId}-${filter.termId}-${filter.classGroupId}`}
          table={await getTeacherAttendanceTable(
            filter.classGroupId,
            filter.termId,
          )}
          classGroupId={filter.classGroupId}
          termId={filter.termId}
        />
      ) : (
        <EmptyState
          title="Vyberte skupinu"
          description="Pro zobrazení docházky vyberte školní rok, pololetí a skupinu."
        />
      )}
    </div>
  );
}
