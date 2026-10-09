/**
 * Parsování vloženého seznamu žáků (jeden žák na řádek) pro hromadné přidání.
 * Prázdné řádky se přeskakují, mezery se ořezávají.
 *
 * "Jméno Příjmení": první slovo = jméno, zbytek = příjmení
 *   "Jan Novák"              → Jan / Novák
 *   "Anna Marie Dvořáková"   → Anna / Marie Dvořáková
 * "Příjmení Jméno": první slovo = příjmení, zbytek = jméno.
 *
 * Řádek s jediným slovem je neplatný (chybí druhá část jména).
 */
export type NameOrder = "FIRST_LAST" | "LAST_FIRST";

export type ParsedStudentLine = {
  /** Původní řádek (pro zobrazení v náhledu). */
  raw: string;
  firstName: string;
  lastName: string;
  /** false = řádek nejde použít (chybí jméno nebo příjmení). */
  valid: boolean;
};

export function parseStudentLine(
  line: string,
  order: NameOrder = "FIRST_LAST",
): ParsedStudentLine {
  const raw = line.trim();
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return { raw, firstName: "", lastName: "", valid: false };
  }
  const [head, ...rest] = tokens;
  const tail = rest.join(" ");
  return order === "FIRST_LAST"
    ? { raw, firstName: head, lastName: tail, valid: true }
    : { raw, firstName: tail, lastName: head, valid: true };
}

export function parseStudentList(
  text: string,
  order: NameOrder = "FIRST_LAST",
): ParsedStudentLine[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => parseStudentLine(line, order));
}
