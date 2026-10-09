import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PointsBadge } from "@/components/ui/points-badge";
import { GradeBadge } from "@/components/ui/grade-badge";
import { EmptyState } from "@/components/ui/states";

type Item = {
  disciplineId: string;
  name: string;
  unit: string | null;
  displayValue: string;
  points: number;
};

/** Read-only tabulka výsledků studenta (atletika / fyzická zdatnost). */
export function StudentResultsView({
  items,
  totalPoints,
  grade,
}: {
  items: Item[];
  totalPoints: number;
  grade: number | null;
}) {
  if (items.length === 0) {
    return <EmptyState title="Žádné disciplíny" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplína</TableHead>
              <TableHead className="text-right">Výkon</TableHead>
              <TableHead className="text-center">Body</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.disciplineId}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {it.displayValue || "–"}
                  {it.displayValue && it.unit ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {it.unit}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-center">
                  <PointsBadge points={it.points} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-6 text-sm">
        <span>
          Body celkem:{" "}
          <span className="font-semibold tabular-nums">{totalPoints}</span>
        </span>
        <span className="flex items-center gap-2">
          Známka: <GradeBadge grade={grade} />
        </span>
      </div>
    </div>
  );
}
