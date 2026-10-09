"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
import { ResponsiveTableWrapper } from "./responsive-table-wrapper";
import {
  auditActionLabels,
  assessmentTypeLabels,
  auditFieldLabels,
  translateEnumLabel,
} from "@/lib/labels";
import type { AuditRow } from "@/lib/data/audit";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Krátký souhrn změny „z → na" podle typu akce. */
function changeSummary(row: AuditRow): string {
  const oldV = asRecord(row.oldValue);
  const newV = asRecord(row.newValue);

  if (row.action === "RESULT_UPDATE") {
    const o = oldV ? `${oldV.rawValue ?? "–"} (${oldV.points ?? 0} b.)` : "–";
    const n = newV ? `${newV.rawValue ?? "–"} (${newV.points ?? 0} b.)` : "–";
    return `${o} → ${n}`;
  }
  if (row.action === "ATTENDANCE_UPDATE") {
    if (row.entityType === "AttendanceLesson") return "Nová hodina";
    const o = (oldV?.code as string) || "–";
    const n = (newV?.code as string) || "–";
    return `${o.toUpperCase()} → ${n.toUpperCase()}`;
  }
  return "—";
}

function Json({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/** Hodnotu zobrazíme srozumitelně (bool → Ano/Ne, objekt → kompaktní JSON). */
function formatValue(value: unknown): string {
  if (value == null || value === "") return "–";
  if (typeof value === "boolean") return value ? "Ano" : "Ne";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Srozumitelný přehled jedné části (původní/nová hodnota, metadata) – klíče česky. */
function ReadableValues({ title, data }: { title: string; data: unknown }) {
  const rec = asRecord(data);
  if (!rec) return null;
  const entries = Object.entries(rec);
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {entries.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-muted-foreground">
              {auditFieldLabels[key] ?? key}:
            </dt>
            <dd className="break-words font-medium tabular-nums">
              {formatValue(value)}
            </dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

export function AuditLogTable({
  rows,
  showStudent = true,
}: {
  rows: AuditRow[];
  showStudent?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (rows.length === 0) {
    return <EmptyState title="Žádné záznamy" description="Pro zvolené filtry nejsou žádné změny." />;
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const colCount = showStudent ? 7 : 6;

  return (
    <ResponsiveTableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="whitespace-nowrap">Datum</TableHead>
            <TableHead>Kdo</TableHead>
            <TableHead>Typ změny</TableHead>
            {showStudent && <TableHead>Žák</TableHead>}
            <TableHead>Detail</TableHead>
            <TableHead>Změna</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isOpen = open.has(row.id);
            return (
              <Fragment key={row.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggle(row.id)}
                >
                  <TableCell>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString("cs-CZ")}
                  </TableCell>
                  <TableCell>{row.userName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {auditActionLabels[
                        row.action as keyof typeof auditActionLabels
                      ] ?? row.action}
                    </Badge>
                  </TableCell>
                  {showStudent && (
                    <TableCell>{row.studentName ?? "—"}</TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {row.disciplineName ??
                      (row.assessmentType
                        ? assessmentTypeLabels[
                            row.assessmentType as keyof typeof assessmentTypeLabels
                          ]
                        : translateEnumLabel("entityType", row.entityType))}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {changeSummary(row)}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={colCount}>
                      {/* Srozumitelný přehled – české popisky klíčů. */}
                      <div className="grid gap-3 py-2 md:grid-cols-3">
                        <ReadableValues
                          title="Původní hodnota"
                          data={row.oldValue}
                        />
                        <ReadableValues
                          title="Nová hodnota"
                          data={row.newValue}
                        />
                        <ReadableValues title="Metadata" data={row.metadata} />
                      </div>

                      {/* Technická data – raw JSON schované za rozbalovací sekcí. */}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                          Zobrazit technická data
                        </summary>
                        <div className="grid gap-3 py-2 md:grid-cols-3">
                          <Json label="Původní hodnota" value={row.oldValue} />
                          <Json label="Nová hodnota" value={row.newValue} />
                          <Json label="Metadata" value={row.metadata} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.ipAddress ? `IP: ${row.ipAddress}` : ""}
                          {row.userAgent ? ` · ${row.userAgent}` : ""}
                        </p>
                      </details>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </ResponsiveTableWrapper>
  );
}
