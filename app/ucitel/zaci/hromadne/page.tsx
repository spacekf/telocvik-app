import Link from "next/link";

import { requireRole } from "@/lib/auth/session";
import {
  getAccessibleClassGroups,
  getActiveSchoolYear,
} from "@/lib/data/common";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { BulkCreateStudents } from "@/components/teacher/bulk-create-students";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BulkStudentsPage() {
  const user = await requireRole("TEACHER");
  const activeYear = await getActiveSchoolYear();
  const groups = activeYear
    ? await getAccessibleClassGroups(user, activeYear.id)
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hromadné přidání žáků"
        description={`Jeden žák na řádek – ${activeYear?.name ?? "není aktivní rok"}`}
        action={
          <Button asChild variant="outline">
            <Link href="/ucitel/zaci">Zpět na žáky</Link>
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          title="Žádné skupiny"
          description="Pro aktivní školní rok nemáte přiřazené žádné skupiny, do kterých by šlo žáky přidat."
        />
      ) : (
        <BulkCreateStudents
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        />
      )}
    </div>
  );
}
