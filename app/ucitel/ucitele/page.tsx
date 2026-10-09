import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CreateTeacherDialog } from "@/components/teacher/create-teacher-dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TeacherTeachers() {
  await requireRole("TEACHER");

  const teachers = await prisma.teacher.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      user: true,
      classGroups: { include: { classGroup: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Učitelé"
        description="Přehled učitelů a jejich přiřazených skupin."
        action={<CreateTeacherDialog />}
      />
      {teachers.length === 0 ? (
        <EmptyState title="Žádní učitelé" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jméno</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Skupiny</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.lastName} {t.firstName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.user?.email ?? "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {t.classGroups.length === 0 ? (
                        <span className="text-muted-foreground">–</span>
                      ) : (
                        t.classGroups.map((cg) => (
                          <Badge key={cg.id} variant="secondary">
                            {cg.classGroup.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
