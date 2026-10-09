"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, MoreHorizontal, CheckCheck } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";
import {
  updateAttendanceRecord,
  quickSetAttendanceRecord,
  bulkUpdateAttendanceForLesson,
} from "@/lib/actions/attendance";
import type { AttendanceMode } from "@/lib/validators/attendance";
import type {
  AttendanceTable as AttendanceTableData,
  AttendanceCellData,
  AttendanceCode,
  AttendanceLessonColumn,
  AttendanceTableRow,
} from "@/lib/data/attendance";
import { NewLessonDialog } from "./new-lesson-dialog";
import { ResponsiveTableWrapper } from "./responsive-table-wrapper";

/** Buňka pro hodinu, ke které žák zatím nemá žádný záznam. */
const EMPTY_CELL: AttendanceCellData = {
  code: "",
  attendedUnits: 0,
  countedUnits: 0,
  note: null,
};

// Pořadí rychlého cyklu při kliknutí na buňku: prázdné → a → n → x → u → prázdné.
const CYCLE = ["", "a", "n", "x", "u"];

function nextCode(current: string): string {
  const i = CYCLE.indexOf(current);
  return CYCLE[(i + 1) % CYCLE.length];
}

function codeToMode(code: string): AttendanceMode {
  return code === "" ? "CLEAR" : (code.toUpperCase() as AttendanceMode);
}

// Barvy podle kódu – rychlá čitelnost. a/u zelená, x oranžová, n červená, prázdné šedá.
function codeColor(code: string): string {
  switch (code) {
    case "a":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
    case "u":
      return "bg-teal-100 text-teal-800 hover:bg-teal-200";
    case "x":
      return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    case "n":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    default:
      return "bg-muted text-muted-foreground hover:bg-accent";
  }
}

function defaultsForCode(
  code: string,
  codes: AttendanceCode[],
  dur: number,
): { attendedUnits: number; countedUnits: number } {
  if (!code) return { attendedUnits: 0, countedUnits: 0 };
  const cfg = codes.find((c) => c.code === code);
  if (!cfg) return { attendedUnits: 0, countedUnits: dur };
  return {
    attendedUnits: cfg.countsAsPresent ? dur : 0,
    countedUnits: cfg.countsInDenominator ? dur : 0,
  };
}

const MODE_LABEL: Record<AttendanceMode, string> = {
  A: "účast",
  U: "uvolněn / uznáno",
  X: "omluveno",
  N: "absence",
  CLEAR: "vymazat záznamy",
};

type EditorTarget = {
  studentId: string;
  studentName: string;
  lesson: AttendanceLessonColumn;
  cell: AttendanceCellData;
};

function recompute(cells: Record<string, AttendanceCellData>) {
  let attended = 0;
  let counted = 0;
  for (const c of Object.values(cells)) {
    attended += c.attendedUnits;
    counted += c.countedUnits;
  }
  const percentage =
    counted === 0 ? 0 : Math.round((attended / counted) * 1000) / 10;
  return { attended, counted, percentage };
}

export function AttendanceTable({
  table,
  classGroupId,
  termId,
}: {
  table: AttendanceTableData;
  classGroupId: string;
  termId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(table.rows);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function applyCell(
    studentId: string,
    lessonId: string,
    cell: AttendanceCellData,
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const cells = { ...r.cells, [lessonId]: cell };
        const t = recompute(cells);
        return {
          ...r,
          cells,
          attendedUnits: t.attended,
          countedUnits: t.counted,
          percentage: t.percentage,
        };
      }),
    );
  }

  // Rychlé přepnutí stavu kliknutím na hlavní část buňky.
  async function cycle(row: AttendanceTableRow, lesson: AttendanceLessonColumn) {
    const prevCell = row.cells[lesson.id];
    const code = nextCode(prevCell?.code ?? "");
    const mode = codeToMode(code);
    const d = defaultsForCode(code, table.codes, lesson.durationUnits);
    const optimistic: AttendanceCellData = {
      code,
      attendedUnits: d.attendedUnits,
      countedUnits: d.countedUnits,
      note: code === "" ? null : (prevCell?.note ?? null),
    };
    applyCell(row.studentId, lesson.id, optimistic); // optimistic
    const res = await quickSetAttendanceRecord({
      lessonId: lesson.id,
      studentId: row.studentId,
      mode,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Uložení selhalo.");
      if (prevCell) applyCell(row.studentId, lesson.id, prevCell);
    } else if (res.data) {
      applyCell(row.studentId, lesson.id, {
        code: res.data.code,
        attendedUnits: res.data.attendedUnits,
        countedUnits: res.data.countedUnits,
        note: optimistic.note,
      });
    }
  }

  // Detailní editace přes modal (1/2 h, poznámka, vlastní hodnoty).
  async function saveDetail(target: EditorTarget, cell: AttendanceCellData) {
    const prevCell = rows.find((r) => r.studentId === target.studentId)?.cells[
      target.lesson.id
    ];
    applyCell(target.studentId, target.lesson.id, cell); // optimistic
    setEditor(null);
    const res = await updateAttendanceRecord({
      lessonId: target.lesson.id,
      studentId: target.studentId,
      code: cell.code,
      attendedUnits: cell.attendedUnits,
      countedUnits: cell.countedUnits,
      note: cell.note ?? undefined,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Uložení selhalo.");
      if (prevCell) applyCell(target.studentId, target.lesson.id, prevCell);
    } else if (res.data) {
      applyCell(target.studentId, target.lesson.id, {
        code: res.data.code,
        attendedUnits: res.data.attendedUnits,
        countedUnits: res.data.countedUnits,
        note: cell.note ?? null,
      });
    }
  }

  // Hromadná akce nad sloupcem (všem nebo jen vybraným).
  async function runBulk(
    lesson: AttendanceLessonColumn,
    mode: AttendanceMode,
    onlySelected: boolean,
  ) {
    const ids = onlySelected
      ? rows.map((r) => r.studentId).filter((id) => selected.has(id))
      : rows.map((r) => r.studentId);
    if (ids.length === 0) return;

    const who = onlySelected ? `vybraným žákům (${ids.length})` : "všem žákům";
    const lessonName = lesson.title ?? "TV";
    if (
      !window.confirm(
        `Opravdu nastavit ${who} v hodině „${lessonName}" (${lesson.durationUnits} h): ${MODE_LABEL[mode]}?`,
      )
    ) {
      return;
    }

    const snapshot = rows;
    const idSet = new Set(ids);
    // Optimistická aktualizace všech cílových řádků.
    setRows((prev) =>
      prev.map((r) => {
        if (!idSet.has(r.studentId)) return r;
        const existing = r.cells[lesson.id];
        const code = mode === "CLEAR" ? "" : mode.toLowerCase();
        const d = defaultsForCode(code, table.codes, lesson.durationUnits);
        const cell: AttendanceCellData = {
          code,
          attendedUnits: d.attendedUnits,
          countedUnits: d.countedUnits,
          note: mode === "CLEAR" ? null : (existing?.note ?? null),
        };
        const cells = { ...r.cells, [lesson.id]: cell };
        const t = recompute(cells);
        return {
          ...r,
          cells,
          attendedUnits: t.attended,
          countedUnits: t.counted,
          percentage: t.percentage,
        };
      }),
    );

    setBusy(true);
    const res = await bulkUpdateAttendanceForLesson({
      lessonId: lesson.id,
      mode,
      studentIds: onlySelected ? ids : undefined,
    });
    setBusy(false);

    if (!res.ok) {
      setRows(snapshot);
      toast.error(res.error ?? "Hromadná úprava selhala.");
    } else {
      toast.success(`Upraveno žáků: ${res.data?.affected ?? ids.length}`);
    }
  }

  function toggleStudent(studentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length
        ? new Set()
        : new Set(rows.map((r) => r.studentId)),
    );
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Kliknutí na buňku rychle přepíná stav. Detail (1/2 h, poznámka)
            upravíte ikonou tužky.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {table.codes.map((c) => (
              <span
                key={c.code}
                className={cn(
                  "rounded px-2 py-0.5 font-medium",
                  codeColor(c.code).split(" hover:")[0],
                )}
              >
                {c.code.toUpperCase()} = {c.label}
              </span>
            ))}
          </div>
        </div>
        <NewLessonDialog
          classGroupId={classGroupId}
          termId={termId}
          onCreated={() => router.refresh()}
        />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">Vybráno žáků: {selected.size}</span>
          <span className="text-xs text-muted-foreground">
            Akci pro vybrané spustíte v menu (⋯) konkrétní hodiny.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Zrušit výběr
          </Button>
        </div>
      )}

      {table.lessons.length === 0 ? (
        <EmptyState
          title="Žádné hodiny"
          description="Zatím nejsou žádné hodiny/datumy. Přidejte první hodinu tlačítkem výše."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="Žádní žáci" />
      ) : (
        <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    aria-label="Vybrat všechny žáky"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                </TableHead>
                <TableHead className="sticky-col min-w-[10rem]">Žák</TableHead>
                <TableHead className="text-center">Účast</TableHead>
                {table.lessons.map((l) => (
                  <TableHead
                    key={l.id}
                    className="whitespace-nowrap text-center text-xs"
                  >
                    <div className="flex flex-col items-center gap-1 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <div>
                          <div>{l.title ?? "TV"}</div>
                          <div className="text-muted-foreground">
                            {new Date(l.date).toLocaleDateString("cs-CZ", {
                              day: "2-digit",
                              month: "2-digit",
                            })}{" "}
                            · {l.durationUnits} h
                          </div>
                        </div>
                        <ColumnMenu
                          selectedCount={selected.size}
                          disabled={busy}
                          onAll={(mode) => runBulk(l, mode, false)}
                          onSelected={(mode) => runBulk(l, mode, true)}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runBulk(l, "A", false)}
                        title="Nastavit celé hodině účast"
                        aria-label="Všichni přítomni – nastavit celé hodině účast"
                        className={cn(
                          "flex min-h-8 w-full items-center justify-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          codeColor("a"),
                        )}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Všichni
                      </button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      aria-label={`Vybrat ${row.studentName}`}
                      checked={selected.has(row.studentId)}
                      onChange={() => toggleStudent(row.studentId)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </TableCell>
                  <TableCell className="sticky-col font-medium">
                    {row.studentName}
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold tabular-nums">
                    {row.countedUnits === 0 ? (
                      <span className="text-muted-foreground">bez dat</span>
                    ) : (
                      <>
                        {row.percentage}%
                        <div className="text-xs font-normal text-muted-foreground">
                          {row.attendedUnits}/{row.countedUnits} h
                        </div>
                      </>
                    )}
                  </TableCell>
                  {table.lessons.map((l) => {
                    const cell = row.cells[l.id] ?? EMPTY_CELL;
                    return (
                      <TableCell key={l.id} className="p-1 text-center">
                        <div className="group relative mx-auto h-11 w-14">
                          <button
                            type="button"
                            onClick={() => cycle(row, l)}
                            className={cn(
                              "absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded text-base font-bold uppercase transition-colors",
                              codeColor(cell.code),
                            )}
                            title="Klik = rychlé přepnutí stavu"
                          >
                            <span>{cell.code ? cell.code.toUpperCase() : "–"}</span>
                            {cell.code && (
                              <span className="text-[10px] font-normal lowercase">
                                {cell.attendedUnits}/{cell.countedUnits}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditor({
                                studentId: row.studentId,
                                studentName: row.studentName,
                                lesson: l,
                                cell,
                              });
                            }}
                            className="absolute -right-1 -top-1 hidden rounded-full border bg-background p-0.5 text-muted-foreground shadow-sm hover:text-foreground group-hover:flex"
                            title="Detailní úprava"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableWrapper>
      )}

      {editor && (
        <CellEditor
          target={editor}
          codes={table.codes}
          onClose={() => setEditor(null)}
          onSave={(cell) => saveDetail(editor, cell)}
        />
      )}
    </div>
  );
}

function ColumnMenu({
  selectedCount,
  disabled,
  onAll,
  onSelected,
}: {
  selectedCount: number;
  disabled: boolean;
  onAll: (mode: AttendanceMode) => void;
  onSelected: (mode: AttendanceMode) => void;
}) {
  const modes: AttendanceMode[] = ["A", "U", "X", "N"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          title="Hromadné akce pro hodinu"
          aria-label="Hromadné akce pro hodinu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Nastavit všem</DropdownMenuLabel>
        {modes.map((m) => (
          <DropdownMenuItem key={m} onClick={() => onAll(m)}>
            Nastavit všem: {MODE_LABEL[m]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => onAll("CLEAR")}>
          Vymazat záznamy v této hodině
        </DropdownMenuItem>

        {selectedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Vybraným ({selectedCount})</DropdownMenuLabel>
            {modes.map((m) => (
              <DropdownMenuItem key={m} onClick={() => onSelected(m)}>
                Vybraným: {MODE_LABEL[m]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onSelected("CLEAR")}>
              Vymazat vybraným
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CellEditor({
  target,
  codes,
  onClose,
  onSave,
}: {
  target: EditorTarget;
  codes: AttendanceCode[];
  onClose: () => void;
  onSave: (cell: AttendanceCellData) => void;
}) {
  const dur = target.lesson.durationUnits;
  const [code, setCode] = useState(target.cell.code);
  const [attended, setAttended] = useState(String(target.cell.attendedUnits));
  const [counted, setCounted] = useState(String(target.cell.countedUnits));
  const [note, setNote] = useState(target.cell.note ?? "");

  function pickCode(c: string) {
    setCode(c);
    const cfg = codes.find((x) => x.code === c);
    const a = cfg?.countsAsPresent ? dur : 0;
    const cnt = cfg?.countsInDenominator ? dur : 0;
    setAttended(String(a));
    setCounted(String(cnt));
  }

  // Rychlé předvolby hodin podle délky.
  const presets = [
    { a: dur, c: dur },
    ...(dur > 1 ? [{ a: Math.floor(dur / 2), c: dur }] : []),
    { a: 0, c: dur },
    { a: 0, c: 0 },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Docházka – {target.studentName}</DialogTitle>
          <DialogDescription>
            {target.lesson.title ?? "TV"} ·{" "}
            {new Date(target.lesson.date).toLocaleDateString("cs-CZ")} · {dur} h
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Kód</Label>
            <div className="flex flex-wrap gap-2">
              {codes.map((c) => (
                <Button
                  key={c.code}
                  type="button"
                  variant={code === c.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => pickCode(c.code)}
                  title={c.label}
                >
                  {c.code.toUpperCase()} · {c.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Rychlé volby (započteno / počítáno)</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttended(String(p.a));
                    setCounted(String(p.c));
                  }}
                >
                  {p.a}/{p.c} h
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Započtené hodiny</Label>
              <Input
                type="number"
                min={0}
                max={dur}
                value={attended}
                onChange={(e) => setAttended(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Počítané hodiny</Label>
              <Input
                type="number"
                min={0}
                max={dur}
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Poznámka</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button
            onClick={() =>
              onSave({
                code,
                attendedUnits: Number(attended) || 0,
                countedUnits: Number(counted) || 0,
                note: note || null,
              })
            }
          >
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
