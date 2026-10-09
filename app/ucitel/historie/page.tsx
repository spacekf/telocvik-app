import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { AuditFilterBar } from "@/components/admin/audit-filter-bar";
import { AuditLogTable } from "@/components/tables/audit-log-table";
import { AuditPagination } from "@/components/tables/audit-pagination";
import { getAllAuditLogs, type AuditFilters } from "@/lib/data/audit";

export default async function TeacherHistory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("TEACHER");
  const sp = await searchParams;

  const filters: AuditFilters = {
    search: sp.search,
    action: sp.action,
    userId: sp.userId,
    classGroupId: sp.classGroupId,
    assessmentType: sp.assessmentType,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [result, users, groups] = await Promise.all([
    getAllAuditLogs(filters),
    prisma.user.findMany({
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historie změn"
        description="Historie změn v systému. Filtrujte podle typu akce, uživatele, skupiny, typu nebo data. Kliknutím na řádek zobrazíte detail."
        action={<RefreshButton />}
      />
      <AuditFilterBar
        users={users.map((u) => ({ id: u.id, name: u.username }))}
        groups={groups}
        current={filters}
      />
      <AuditLogTable rows={result.rows} />
      <AuditPagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}
