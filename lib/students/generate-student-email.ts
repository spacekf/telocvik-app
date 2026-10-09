/**
 * Generování školního e-mailu žáka: příjmení + první písmeno jména + @primmat.cz.
 * Vše bez diakritiky, lowercase, jen znaky a-z0-9.
 *
 * Špaček František → spacekf@primmat.cz
 * Novák Jan       → novakj@primmat.cz
 * Černá Eva       → cernae@primmat.cz
 * Dvořáková Anna  → dvorakovaa@primmat.cz
 */

export const STUDENT_EMAIL_DOMAIN = "primmat.cz";

export function normalizeCzechText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // odstraň diakritiku
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Základ přihlašovacího identifikátoru žáka ("handle"): příjmení + první
 * písmeno jména, bez diakritiky. Špaček František → "spacekf".
 * Prázdný řetězec, pokud jméno neobsahuje žádné znaky a-z0-9.
 */
export function generateStudentHandle(
  firstName: string,
  lastName: string,
): string {
  const normalizedLastName = normalizeCzechText(lastName);
  const firstLetter = normalizeCzechText(firstName).charAt(0);
  return `${normalizedLastName}${firstLetter}`;
}

export function generateStudentEmail(
  firstName: string,
  lastName: string,
): string {
  return `${generateStudentHandle(firstName, lastName)}@${STUDENT_EMAIL_DOMAIN}`;
}

/** Uživatelské jméno žáka = e-mail bez domény. Špaček František → "spacekf". */
export function generateStudentUsername(
  firstName: string,
  lastName: string,
): string {
  return generateStudentHandle(firstName, lastName);
}

/**
 * Najde první volný handle v řadě base, base2, base3, … (e-mail i username
 * pak dostanou stejné číslo). `isTaken` rozhoduje o obsazenosti (typicky dotaz
 * do DB na e-mail i username). Vrací null, pokud do `maxAttempts` nic nenajde.
 */
export async function findFreeStudentHandle(
  base: string,
  isTaken: (handle: string) => Promise<boolean>,
  maxAttempts = 1000,
): Promise<string | null> {
  for (let n = 1; n <= maxAttempts; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return null;
}

/** Klíč identity žáka pro detekci kolizí (různí lidé se stejným e-mailem). */
export function studentIdentityKey(
  firstName: string,
  lastName: string,
): string {
  return `${normalizeCzechText(lastName)}|${normalizeCzechText(firstName)}`;
}
