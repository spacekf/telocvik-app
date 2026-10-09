import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  formatPerformanceValue,
  calculatePerformanceDelta,
  formatPerformanceDelta,
  getImprovementLabel,
  type Improvement,
} from "@/lib/scoring/scoring";

export type ProgressPoint = {
  recordedAt: string;
  displayValue: string;
  rawValue: string | null;
  points: number;
};

export type ProgressDiscipline = {
  disciplineId: string;
  name: string;
  assessmentType: string;
  valueType: string;
  unit: string | null;
  points: ProgressPoint[];
  firstValue: string;
  lastValue: string;
  deltaLabel: string;
  pointsDelta: number;
  improvement: Improvement;
  improvementLabel: string;
};

/**
 * Vývoj výkonů žáka z ResultHistory, seskupený podle disciplíny.
 * Bezpečnost (kdo smí číst koho) řeší volající (page přes requireRole + ownership).
 */
export async function getStudentProgress(
  studentId: string,
): Promise<ProgressDiscipline[]> {
  const history = await prisma.resultHistory.findMany({
    where: { studentId },
    orderBy: { recordedAt: "asc" },
    include: { discipline: true },
  });

  const byDiscipline = new Map<string, typeof history>();
  for (const h of history) {
    const list = byDiscipline.get(h.disciplineId) ?? [];
    list.push(h);
    byDiscipline.set(h.disciplineId, list);
  }

  const out: ProgressDiscipline[] = [];
  for (const [disciplineId, entries] of byDiscipline) {
    const d = entries[0].discipline;
    const points: ProgressPoint[] = entries.map((e) => ({
      recordedAt: e.recordedAt.toISOString(),
      displayValue:
        e.numericValue != null
          ? formatPerformanceValue(e.numericValue, d.valueType)
          : (e.rawValue ?? "–"),
      rawValue: e.rawValue,
      points: e.points,
    }));

    const first = entries[0];
    const last = entries[entries.length - 1];
    const { delta, improvement } = calculatePerformanceDelta(
      first.numericValue,
      last.numericValue,
      d.scoringDirection,
    );

    out.push({
      disciplineId,
      name: d.name,
      assessmentType: d.assessmentType,
      valueType: d.valueType,
      unit: d.unit,
      points,
      firstValue: points[0].displayValue,
      lastValue: points[points.length - 1].displayValue,
      deltaLabel: formatPerformanceDelta(delta, d.valueType, d.unit),
      pointsDelta: last.points - first.points,
      improvement,
      improvementLabel: getImprovementLabel(improvement),
    });
  }

  // Seřaď: nejdřív atletika, pak fyzická, uvnitř dle názvu.
  return out.sort(
    (a, b) =>
      a.assessmentType.localeCompare(b.assessmentType) ||
      a.name.localeCompare(b.name, "cs"),
  );
}
