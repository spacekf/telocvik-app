import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

type Lesson = {
  id: string;
  date: string;
  label: string;
  title: string | null;
  durationUnits: number;
};
type Record = {
  lessonId: string;
  code: string;
  attendedUnits: number;
  countedUnits: number;
  note: string | null;
};

/** Read-only vážená docházka studenta (v hodinách i procentech). */
export function StudentAttendanceView({
  lessons,
  records,
  codes,
  percentage,
  attendedUnits,
  countedUnits,
}: {
  lessons: Lesson[];
  records: Record[];
  codes: { code: string; label: string }[];
  percentage: number;
  attendedUnits: number;
  countedUnits: number;
}) {
  const codeLabel = new Map(codes.map((c) => [c.code, c.label]));
  const recByLesson = new Map(records.map((r) => [r.lessonId, r]));

  if (lessons.length === 0) {
    return (
      <EmptyState
        title="Žádné hodiny"
        description="Zatím není evidována žádná docházka."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Celková účast:</span>
        <Badge variant="secondary" className="text-base">
          {countedUnits === 0 ? "bez dat" : `${percentage} %`}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Splněno {attendedUnits}/{countedUnits} h
        </span>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum / akce</TableHead>
              <TableHead className="text-center">Hodin</TableHead>
              <TableHead className="text-center">Kód</TableHead>
              <TableHead className="text-center">Započteno</TableHead>
              <TableHead>Poznámka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((l) => {
              const rec = recByLesson.get(l.id);
              const code = rec?.code ?? "";
              return (
                <TableRow key={l.id}>
                  <TableCell>{l.label}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {l.durationUnits} h
                  </TableCell>
                  <TableCell className="text-center font-semibold uppercase">
                    {code || "–"}
                    {code && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {codeLabel.get(code) ?? ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {rec ? `${rec.attendedUnits}/${rec.countedUnits} h` : "–"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rec?.note ?? ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
