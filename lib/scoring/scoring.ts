import type { ValueType, ScoringDirection, AssessmentType } from "@prisma/client";

/**
 * Server-side výpočet bodů a známek. Body NIKDY nepočítáme na klientovi
 * jako zdroj pravdy – tato utilita je jediným autoritativním zdrojem.
 */

export type ScoringRuleLike = {
  points: number;
  minValue: number | null;
  maxValue: number | null;
};

export type DisciplineLike = {
  valueType: ValueType;
  scoringDirection: ScoringDirection;
  scoringRules: ScoringRuleLike[];
};

export type GradeRuleLike = {
  minPoints: number;
  maxPoints: number;
  grade: number;
};

// Markery, které znamenají "neměřeno / neplatné" → 0 bodů.
const INVALID_MARKERS = new Set(["", "-", "n", "n:nn", "x", "nn"]);

/**
 * Naparsuje syrový vstup učitele na číselnou hodnotu.
 * Vrací null pro prázdné/neplatné vstupy (→ 0 bodů).
 */
export function parsePerformanceValue(
  rawValue: string | null | undefined,
  valueType: ValueType,
): number | null {
  if (rawValue == null) return null;
  const raw = String(rawValue).trim();
  if (INVALID_MARKERS.has(raw.toLowerCase())) return null;

  if (valueType === "TEXT") return null;

  if (valueType === "TIME_SECONDS") {
    // Podporuje "m:ss", "m:ss.x" i čisté sekundy.
    if (raw.includes(":")) {
      const parts = raw.split(":");
      if (parts.length !== 2) return null;
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1].replace(",", "."));
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
      return minutes * 60 + seconds;
    }
    const asNumber = Number(raw.replace(",", "."));
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  // NUMBER (vč. desetinných sekund u 100 m, délek, vrhů, přesahu...)
  const normalized = raw.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Sekundy → m:ss (např. 330 → "5:30", 525 → "8:45"). Pro editor scoring
 * pravidel u časových disciplín, kde jsou hodnoty uložené v sekundách.
 */
export function formatSecondsToTime(value: number | null | undefined): string {
  if (value == null) return "";
  const total = Math.max(0, value);
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Naformátuje uloženou hodnotu zpět pro zobrazení v UI. */
export function formatPerformanceValue(
  value: number | null | undefined,
  valueType: ValueType,
): string {
  if (value == null) return "";

  if (valueType === "TIME_SECONDS") {
    const totalSeconds = Math.max(0, value);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const secondsStr =
      seconds < 10 ? `0${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}` : seconds.toFixed(seconds % 1 === 0 ? 0 : 1);
    return `${minutes}:${secondsStr}`;
  }

  return String(value);
}

/**
 * Spočítá body pro disciplínu podle ScoringRule z DB.
 * Pravidla jsou nepřekrývající se intervaly [minValue, maxValue]
 * (null = otevřený konec). Pokud hodnota neodpovídá žádnému pravidlu → 0.
 */
export function calculatePoints(
  discipline: DisciplineLike,
  numericValue: number | null,
): number {
  if (numericValue == null) return 0;

  for (const rule of discipline.scoringRules) {
    const minOk = rule.minValue == null || numericValue >= rule.minValue;
    const maxOk = rule.maxValue == null || numericValue <= rule.maxValue;
    if (minOk && maxOk) return rule.points;
  }
  return 0;
}

/** Součet bodů všech disciplín daného assessmentu. */
export function calculateTotalPoints(
  results: Array<{ points: number }>,
): number {
  return results.reduce((sum, r) => sum + (r.points ?? 0), 0);
}

/** Známka podle GradeRule (interval [minPoints, maxPoints]). */
export function calculateGrade(
  totalPoints: number,
  gradeRules: GradeRuleLike[],
): number {
  for (const rule of gradeRules) {
    if (totalPoints >= rule.minPoints && totalPoints <= rule.maxPoints) {
      return rule.grade;
    }
  }
  // Fallback – nejhorší známka, pokud chybí pravidlo.
  return 5;
}

/** Souhrn assessmentu: celkové body + známka. */
export function calculateAssessmentSummary(
  results: Array<{ points: number }>,
  gradeRules: GradeRuleLike[],
): { totalPoints: number; grade: number } {
  const totalPoints = calculateTotalPoints(results);
  const grade = calculateGrade(totalPoints, gradeRules);
  return { totalPoints, grade };
}

/** Výchozí pravidla známek dle zadání (fallback + seed). */
export const DEFAULT_GRADE_RULES: Array<GradeRuleLike & { label: string }> = [
  { minPoints: 20, maxPoints: 100000, grade: 1, label: "20 a více bodů" },
  { minPoints: 15, maxPoints: 19, grade: 2, label: "15–19 bodů" },
  { minPoints: 10, maxPoints: 14, grade: 3, label: "10–14 bodů" },
  { minPoints: 5, maxPoints: 9, grade: 4, label: "5–9 bodů" },
  { minPoints: 0, maxPoints: 4, grade: 5, label: "0–4 body" },
];

/**
 * Naformátuje rozsah jednoho bodovacího pravidla pro zobrazení v tabulce
 * hodnocení. Časy se zobrazují jako m:ss, podle směru se volí slovní popis.
 */
export function formatScoringRange(
  rule: { minValue: number | null; maxValue: number | null },
  discipline: { valueType: string; scoringDirection: string },
): string {
  const fmt = (v: number) =>
    discipline.valueType === "TIME_SECONDS"
      ? formatPerformanceValue(v, "TIME_SECONDS")
      : String(v);

  const { minValue: min, maxValue: max } = rule;

  if (min != null && max != null) {
    return `${fmt(min)} – ${fmt(max)}`;
  }
  if (discipline.scoringDirection === "LOWER_IS_BETTER") {
    if (min == null && max != null) return `do ${fmt(max)}`;
    if (max == null && min != null) return `${fmt(min)} a více`;
  } else {
    // HIGHER_IS_BETTER / RANGE
    if (max == null && min != null) return `${fmt(min)} a více`;
    if (min == null && max != null) return `${fmt(max)} a méně`;
  }
  return "–";
}

export type Improvement = "UP" | "SAME" | "DOWN";

/**
 * Rozdíl výkonu mezi prvním a posledním měřením + směr zlepšení dle
 * scoringDirection (u TIME_SECONDS i LOWER_IS_BETTER je nižší hodnota lepší).
 */
export function calculatePerformanceDelta(
  first: number | null | undefined,
  last: number | null | undefined,
  scoringDirection: string,
): { delta: number | null; improvement: Improvement } {
  if (first == null || last == null) return { delta: null, improvement: "SAME" };
  const delta = Math.round((last - first) * 100) / 100;
  if (delta === 0) return { delta, improvement: "SAME" };
  const higherBetter = scoringDirection === "HIGHER_IS_BETTER";
  const improved = higherBetter ? delta > 0 : delta < 0;
  return { delta, improvement: improved ? "UP" : "DOWN" };
}

export function getImprovementLabel(improvement: Improvement): string {
  if (improvement === "UP") return "Zlepšení";
  if (improvement === "DOWN") return "Zhoršení";
  return "Beze změny";
}

/** Naformátuje rozdíl výkonu s jednotkou (čas v sekundách → "s"). */
export function formatPerformanceDelta(
  delta: number | null,
  valueType: string,
  unit: string | null,
): string {
  if (delta == null) return "–";
  const sign = delta > 0 ? "+" : "";
  const u = valueType === "TIME_SECONDS" ? " s" : unit ? ` ${unit}` : "";
  return `${sign}${delta}${u}`;
}

/** Barva CSS třídy podle známky pro UI badge. */
export function gradeColorClass(grade: number): string {
  switch (grade) {
    case 1:
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case 2:
      return "bg-lime-100 text-lime-800 border-lime-300";
    case 3:
      return "bg-amber-100 text-amber-800 border-amber-300";
    case 4:
      return "bg-orange-100 text-orange-800 border-orange-300";
    default:
      return "bg-red-100 text-red-800 border-red-300";
  }
}

export type { AssessmentType };
