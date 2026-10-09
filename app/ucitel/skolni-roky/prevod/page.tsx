import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { RolloverWizard } from "@/components/teacher/rollover-wizard";

export default async function RolloverPage() {
  await requireRole("TEACHER");

  const years = await prisma.schoolYear.findMany({
    orderBy: { startsAt: "desc" },
    select: { id: true, name: true, isActive: true },
  });

  return (
    <div>
      <PageHeader
        title="Převod školního roku"
        description="Povýšení ročníků a převod žáků do nového školního roku. Historická data zůstanou zachována."
      />
      <RolloverWizard years={years} />
    </div>
  );
}
