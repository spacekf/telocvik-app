import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ClassesClient } from "@/components/admin/classes-client";

export default async function TeacherClasses() {
  await requireRole("TEACHER");

  const [groups, years] = await Promise.all([
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      include: { schoolYear: true, _count: { select: { students: true } } },
    }),
    prisma.schoolYear.findMany({ orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Třídy / skupiny" description="Správa skupin žáků" />
      <ClassesClient
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          gradeYear: g.gradeYear,
          gender: g.gender,
          schoolYear: g.schoolYear.name,
          students: g._count.students,
        }))}
        years={years.map((y) => ({ id: y.id, name: y.name }))}
      />
    </div>
  );
}
