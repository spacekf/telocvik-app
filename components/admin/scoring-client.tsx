"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateScoringRule } from "@/lib/actions/scoring";
import { formatSecondsToTime } from "@/lib/scoring/scoring";

type Rule = {
  id: string;
  points: number;
  minValue: number | null;
  maxValue: number | null;
};

type Discipline = {
  id: string;
  name: string;
  assessmentType: string;
  gender: string;
  unit: string | null;
  valueType: string;
  rules: Rule[];
};

/** Náhled času pod inputem (jen u časových disciplín). */
function TimeHint({ value, isTime }: { value: string; isTime: boolean }) {
  if (!isTime) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return (
    <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
      {formatSecondsToTime(n)}
    </span>
  );
}

function RuleRow({ rule, isTime }: { rule: Rule; isTime: boolean }) {
  const [points, setPoints] = useState(String(rule.points));
  const [min, setMin] = useState(rule.minValue == null ? "" : String(rule.minValue));
  const [max, setMax] = useState(rule.maxValue == null ? "" : String(rule.maxValue));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await updateScoringRule({
      ruleId: rule.id,
      points: Number(points),
      minValue: min === "" ? null : Number(min),
      maxValue: max === "" ? null : Number(max),
    });
    setSaving(false);
    if (!res.ok) toast.error(res.error ?? "Uložení selhalo.");
    else toast.success("Pravidlo uloženo");
  }

  const inputCls =
    "h-8 w-20 rounded border border-input bg-transparent px-2 text-sm tabular-nums";

  return (
    <TableRow>
      <TableCell className="align-top">
        <input
          className={inputCls}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </TableCell>
      <TableCell className="align-top">
        <input
          className={inputCls}
          value={min}
          placeholder="−∞"
          onChange={(e) => setMin(e.target.value)}
        />
        <TimeHint value={min} isTime={isTime} />
      </TableCell>
      <TableCell className="align-top">
        <input
          className={inputCls}
          value={max}
          placeholder="+∞"
          onChange={(e) => setMax(e.target.value)}
        />
        <TimeHint value={max} isTime={isTime} />
      </TableCell>
      <TableCell className="text-right align-top">
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>
          {saving ? "..." : "Uložit"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ScoringClient({ disciplines }: { disciplines: Discipline[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {disciplines.map((d) => {
        const isTime = d.valueType === "TIME_SECONDS";
        // U časových disciplín nezobrazuj zavádějící "(min)" – hodnoty jsou v sekundách.
        const unitLabel = isTime ? null : d.unit;
        return (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  {d.name}
                  {unitLabel ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({unitLabel})
                    </span>
                  ) : null}
                </span>
                <span className="flex gap-1">
                  <Badge variant="secondary">
                    {d.assessmentType === "ATHLETICS" ? "atletika" : "fyzická"}
                  </Badge>
                  <Badge variant="outline">
                    {d.gender === "GIRLS" ? "dívky" : "chlapci"}
                  </Badge>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTime && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Hodnoty jsou uložené v sekundách. V přehledu se zobrazují jako
                  minuty:sekundy.
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Body</TableHead>
                    <TableHead>{isTime ? "Od času" : "Od"}</TableHead>
                    <TableHead>{isTime ? "Do času" : "Do"}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.rules.map((r) => (
                    <RuleRow key={r.id} rule={r} isTime={isTime} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
