/**
 * Výpočet VÁŽENÉ docházky. Každá hodina/akce má váhu v hodinách
 * (AttendanceLesson.durationUnits) a u žáka se eviduje attendedUnits/countedUnits.
 * Procento = součet attendedUnits / součet countedUnits.
 */

export type AttendanceCodeConfigLike = {
  code: string;
  countsAsPresent: boolean;
  countsInDenominator: boolean;
};

/** Normalizuje docházkový kód (např. "A " → "a"). */
export function normalizeAttendanceCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toLowerCase();
}

export type WeightedAttendance = {
  attendedUnits: number;
  countedUnits: number;
  percentage: number;
};

/**
 * Vážená docházka: attended / counted * 100.
 * Pokud je countedUnits = 0, procento je 0 (a hasData=false → "bez dat").
 */
export function calculateWeightedAttendance(
  records: Array<{ attendedUnits: number; countedUnits: number }>,
): WeightedAttendance {
  const attendedUnits = records.reduce((s, r) => s + (r.attendedUnits ?? 0), 0);
  const countedUnits = records.reduce((s, r) => s + (r.countedUnits ?? 0), 0);
  const percentage =
    countedUnits === 0
      ? 0
      : Math.round((attendedUnits / countedUnits) * 1000) / 10;
  return { attendedUnits, countedUnits, percentage };
}

/**
 * Výchozí započtené/počítané hodiny pro kód podle konfigurace a délky hodiny.
 * Slouží jako rychlá předvolba při kliknutí na kód.
 */
export function defaultUnitsForCode(
  cfg: AttendanceCodeConfigLike | undefined,
  durationUnits: number,
): { attendedUnits: number; countedUnits: number } {
  if (!cfg) return { attendedUnits: 0, countedUnits: durationUnits };
  return {
    attendedUnits: cfg.countsAsPresent ? durationUnits : 0,
    countedUnits: cfg.countsInDenominator ? durationUnits : 0,
  };
}
