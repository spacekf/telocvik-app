import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function TeacherSchoolYears() {
  await requireRole("TEACHER");

  const years = await prisma.schoolYear.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { classGroups: true, terms: true } } },
  });

  return (
    <div>
      <PageHeader title="Školní roky" description="Přehled školních roků" />
      {years.length === 0 ? (
        <EmptyState title="Žádné školní roky" description="Spusťte seed pro vytvoření výchozího roku." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Od</TableHead>
                <TableHead>Do</TableHead>
                <TableHead>Pololetí</TableHead>
                <TableHead>Skupiny</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell>{y.startsAt.toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{y.endsAt.toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{y._count.terms}</TableCell>
                  <TableCell>{y._count.classGroups}</TableCell>
                  <TableCell>
                    {y.isActive ? (
                      <Badge>aktivní</Badge>
                    ) : (
                      <Badge variant="secondary">neaktivní</Badge>
                    )}
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
