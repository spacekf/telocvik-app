"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/ui/grade-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveTableWrapper } from "@/components/tables/responsive-table-wrapper";
import { formatScoringRange } from "@/lib/scoring/scoring";
import { assessmentTypeLabels, genderLabels } from "@/lib/labels";
import type { ScoringReference } from "@/lib/data/scoring";
import { cn } from "@/lib/utils/cn";

type AssessmentType = "ATHLETICS" | "FITNESS";
type Gender = "GIRLS" | "BOYS";

function formatGradePoints(min: number, max: number): string {
  if (max >= 1000) return `${min} a více`;
  return `${min}–${max}`;
}

export function ScoringRulesView({ data }: { data: ScoringReference }) {
  const [type, setType] = useState<AssessmentType>("ATHLETICS");
  const [gender, setGender] = useState<Gender>("GIRLS");

  const disciplines = data.disciplines.filter(
    (d) => d.assessmentType === type && d.gender === gender,
  );
  const gradeRules = data.gradeRules
    .filter((g) => g.assessmentType === type)
    .sort((a, b) => a.grade - b.grade);

  return (
    <div className="space-y-4">
      <Tabs value={type} onValueChange={(v) => setType(v as AssessmentType)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ATHLETICS">
              {assessmentTypeLabels.ATHLETICS}
            </TabsTrigger>
            <TabsTrigger value="FITNESS">
              {assessmentTypeLabels.FITNESS}
            </TabsTrigger>
          </TabsList>

          {/* Přepínač pohlaví */}
          <div className="inline-flex rounded-lg border bg-card p-1">
            {(["GIRLS", "BOYS"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={cn(
                  "rounded-md px-4 py-1 text-sm font-medium transition-colors",
                  gender === g
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {genderLabels[g]}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value={type} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {disciplines.map((d) => (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{d.name}</span>
                    {d.valueType === "TIME_SECONDS" ? (
                      <Badge variant="secondary">čas (m:ss)</Badge>
                    ) : d.unit ? (
                      <Badge variant="secondary">{d.unit}</Badge>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Výkon</TableHead>
                        <TableHead className="text-right">Body</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.rules.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="tabular-nums">
                            {formatScoringRange(r, d)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {r.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pravidla známkování</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTableWrapper sticky={false} maxHeightClass="">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Body celkem</TableHead>
                      <TableHead className="text-right">Známka</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeRules.map((g) => (
                      <TableRow key={g.grade}>
                        <TableCell className="tabular-nums">
                          {formatGradePoints(g.minPoints, g.maxPoints)}
                        </TableCell>
                        <TableCell className="text-right">
                          <GradeBadge grade={g.grade} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTableWrapper>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
