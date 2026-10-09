import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ImportClient } from "@/components/admin/import-client";
import { getActiveSchoolYear } from "@/lib/data/common";

export const dynamic = "force-dynamic";

export default async function TeacherImport() {
  await requireRole("TEACHER");
  const year = await getActiveSchoolYear();

  return (
    <div>
      <PageHeader
        title="Import Excelů"
        description={`Cílový školní rok: ${year?.name ?? "není nastaven"}`}
      />
      <ImportClient />
    </div>
  );
}
