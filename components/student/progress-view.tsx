"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ResponsiveTableWrapper } from "@/components/tables/responsive-table-wrapper";
import { assessmentTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils/cn";
import type { ProgressDiscipline } from "@/lib/data/progress";

type TypeFilter = "ALL" | "ATHLETICS" | "FITNESS";

function ImprovementBadge({ d }: { d: ProgressDiscipline }) {
  const Icon =
    d.improvement === "UP"
      ? TrendingUp
      : d.improvement === "DOWN"
        ? TrendingDown
        : Minus;
  const cls =
    d.improvement === "UP"
      ? "bg-emerald-100 text-emerald-800"
      : d.improvement === "DOWN"
        ? "bg-red-100 text-red-800"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {d.improvementLabel}
    </span>
  );
}

export function ProgressView({
  disciplines,
}: {
  disciplines: ProgressDiscipline[];
}) {
  const [type, setType] = useState<TypeFilter>("ALL");
  const [disciplineId, setDisciplineId] = useState<string>("all");

  const byType = disciplines.filter(
    (d) => type === "ALL" || d.assessmentType === type,
  );
  const shown = byType.filter(
    (d) => disciplineId === "all" || d.disciplineId === disciplineId,
  );

  if (disciplines.length === 0) {
    return (
      <EmptyState
        title="Zatím žádná data"
        description="Vývoj se zobrazí, jakmile budou zapsané výkony."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ATHLETICS", "FITNESS"] as TypeFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setDisciplineId("all");
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              type === t
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {t === "ALL" ? "Vše" : assessmentTypeLabels[t]}
          </button>
        ))}
        <select
          value={disciplineId}
          onChange={(e) => setDisciplineId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="all">Všechny disciplíny</option>
          {byType.map((d) => (
            <option key={d.disciplineId} value={d.disciplineId}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Žádná data pro tento filtr" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((d) => (
            <Card key={d.disciplineId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{d.name}</span>
                  <ImprovementBadge d={d} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">První</p>
                    <p className="font-semibold tabular-nums">{d.firstValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Poslední</p>
                    <p className="font-semibold tabular-nums">{d.lastValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rozdíl</p>
                    <p className="font-semibold tabular-nums">{d.deltaLabel}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Změna bodů:{" "}
                  <span className="font-medium text-foreground">
                    {d.pointsDelta > 0 ? `+${d.pointsDelta}` : d.pointsDelta}
                  </span>
                </div>

                <ResponsiveTableWrapper sticky={false} maxHeightClass="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Výkon</TableHead>
                        <TableHead className="text-right">Body</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.points.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">
                            {new Date(p.recordedAt).toLocaleDateString("cs-CZ")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.displayValue}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Badge variant="secondary">{p.points}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTableWrapper>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
