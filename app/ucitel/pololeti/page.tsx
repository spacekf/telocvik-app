import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TeacherTerms() {
  await requireRole("TEACHER");

  const terms = await prisma.term.findMany({
    orderBy: [{ schoolYear: { startsAt: "desc" } }, { order: "asc" }],
    include: { schoolYear: true },
  });

  return (
    <div>
      <PageHeader title="Pololetí" description="Přehled pololetí podle školních roků" />
      {terms.length === 0 ? (
        <EmptyState title="Žádná pololetí" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Školní rok</TableHead>
                <TableHead>Pololetí</TableHead>
                <TableHead>Pořadí</TableHead>
                <TableHead>Od</TableHead>
                <TableHead>Do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.schoolYear.name}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.order}</TableCell>
                  <TableCell>{t.startsAt.toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{t.endsAt.toLocaleDateString("cs-CZ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
