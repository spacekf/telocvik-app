"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";

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
import { EditableCell } from "./editable-cell";
import { ResponsiveTableWrapper } from "./responsive-table-wrapper";
import { updateStudentResult } from "@/lib/actions/results";
import type { AssessmentTable } from "@/lib/data/results";

export function ResultsTable({ table }: { table: AssessmentTable }) {
  const [rows, setRows] = useState(table.rows);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Žádní žáci"
        description="Ve vybrané skupině zatím nejsou žádní žáci. Přidejte je v administraci nebo importem."
      />
    );
  }

  async function handleCommit(
    studentId: string,
    disciplineId: string,
    raw: string,
  ) {
    const res = await updateStudentResult({
      assessmentId: table.assessmentId,
      studentId,
      disciplineId,
      rawValue: raw,
    });

    if (!res.ok) {
      toast.error(res.error ?? "Uložení selhalo.");
      throw new Error(res.error);
    }

    setRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [disciplineId]: {
                  rawValue: res.rawValue ?? raw,
                  points: res.points ?? 0,
                },
              },
              totalPoints: res.totalPoints ?? row.totalPoints,
              grade: res.grade ?? row.grade,
            }
          : row,
      ),
    );
    toast.success("Uloženo");
  }

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Tip: Enter uloží a skočí na dalšího žáka ve stejné disciplíně
        (Shift+Enter nebo ↑ o řádek výš).
      </p>
      <ResponsiveTableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky-col min-w-[12rem]">Žák</TableHead>
              {table.disciplines.map((d) => (
                <TableHead key={d.id} className="text-center" colSpan={2}>
                  {d.name}
                  {d.unit ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({d.unit})
                    </span>
                  ) : null}
                </TableHead>
              ))}
              <TableHead className="text-center">Body celkem</TableHead>
              <TableHead className="text-center">Známka</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="sticky-col" />
              {table.disciplines.map((d) => (
                <Fragment key={d.id}>
                  <TableHead className="text-center text-xs">výkon</TableHead>
                  <TableHead className="text-center text-xs">body</TableHead>
                </Fragment>
              ))}
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.studentId}>
                <TableCell className="sticky-col font-medium">
                  {row.studentName}
                </TableCell>
                {table.disciplines.map((d) => (
                  <Fragment key={d.id}>
                    <TableCell className="p-1">
                      <EditableCell
                        value={row.cells[d.id]?.rawValue ?? ""}
                        placeholder="–"
                        rowIndex={rowIndex}
                        colKey={d.id}
                        onCommit={(next) =>
                          handleCommit(row.studentId, d.id, next)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <PointsBadge points={row.cells[d.id]?.points ?? 0} />
                    </TableCell>
                  </Fragment>
                ))}
                <TableCell className="text-center font-semibold tabular-nums">
                  {row.totalPoints}
                </TableCell>
                <TableCell className="text-center">
                  <GradeBadge grade={row.grade} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTableWrapper>
    </>
  );
}
