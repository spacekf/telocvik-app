import type { Role, Gender, AssessmentType, AuditAction } from "@prisma/client";

/** Lidsky čitelné popisky enumů – v UI nikdy nezobrazujeme technické názvy. */

export const roleLabels: Record<Role, string> = {
  TEACHER: "Učitel",
  STUDENT: "Žák",
};

export const genderLabels: Record<Gender, string> = {
  GIRLS: "Dívky",
  BOYS: "Chlapci",
};

export const assessmentTypeLabels: Record<AssessmentType, string> = {
  ATHLETICS: "Atletika",
  FITNESS: "Fyzická zdatnost",
};

export const auditActionLabels: Record<AuditAction, string> = {
  RESULT_UPDATE: "Úprava výsledku",
  ATTENDANCE_UPDATE: "Úprava docházky",
  ATTENDANCE_BULK_UPDATE: "Hromadná úprava docházky",
  USER_CREATE: "Vytvoření uživatele",
  USER_UPDATE: "Úprava uživatele",
  IMPORT_RUN: "Import Excelu",
  LOGIN: "Přihlášení",
  LOGOUT: "Odhlášení",
  PASSWORD_CHANGE_REQUIRED: "Vyžádána změna hesla",
  PASSWORD_CHANGED: "Heslo změněno",
  STUDENT_PASSWORD_RESET: "Reset hesla žáka",
  STUDENT_PROFILE_UPDATED: "Úprava profilu žáka",
  STUDENT_ENROLLMENT_UPDATED: "Změna skupiny žáka",
  STUDENT_ACCOUNT_STATUS_UPDATED: "Změna stavu účtu",
  SCHOOL_YEAR_ROLLOVER: "Převod školního roku",
};

/** Technické názvy entit (entityType z DB) → český popisek pro UI. */
export const entityTypeLabels: Record<string, string> = {
  User: "Uživatel",
  Student: "Žák",
  Teacher: "Učitel",
  StudentEnrollment: "Zařazení žáka",
  ClassGroup: "Třída / skupina",
  SchoolYear: "Školní rok",
  Term: "Pololetí",
  AttendanceLesson: "Hodina docházky",
  AttendanceRecord: "Docházka",
  Result: "Výsledek",
  Assessment: "Hodnocení",
  Discipline: "Disciplína",
  ResultHistory: "Historie výkonu",
  Import: "Import",
};

/** Klíče v JSON detailu audit logu → český popisek. Neznámý klíč = fallback na klíč. */
export const auditFieldLabels: Record<string, string> = {
  rawValue: "Hodnota",
  numericValue: "Číselná hodnota",
  points: "Body",
  code: "Kód",
  attendedUnits: "Splněné hodiny",
  countedUnits: "Počítané hodiny",
  durationUnits: "Délka hodiny / akce",
  mode: "Režim",
  scope: "Rozsah",
  affectedStudentsCount: "Počet ovlivněných žáků",
  classGroupId: "ID skupiny",
  classGroupName: "Skupina",
  lessonId: "ID hodiny",
  studentId: "ID žáka",
  studentUserId: "ID uživatelského účtu žáka",
  schoolYearId: "ID školního roku",
  termId: "ID pololetí",
  assessmentId: "ID hodnocení",
  disciplineId: "ID disciplíny",
  assessmentType: "Typ hodnocení",
  changedByUserId: "Změnil uživatel",
  resetByUserId: "Resetoval uživatel",
  mustChangePassword: "Vyžadována změna hesla",
  isActive: "Aktivní účet",
  firstName: "Jméno",
  lastName: "Příjmení",
  email: "E-mail",
  username: "Uživatelské jméno",
};

/** Stavy (např. EnrollmentStatus) → český popisek. */
export const statusLabels: Record<string, string> = {
  ACTIVE: "Aktivní",
  GRADUATED: "Absolvoval/a",
  ARCHIVED: "Archivováno",
};

type LabelMap =
  | "role"
  | "gender"
  | "assessmentType"
  | "auditAction"
  | "entityType"
  | "status";

const maps: Record<LabelMap, Record<string, string>> = {
  role: roleLabels,
  gender: genderLabels,
  assessmentType: assessmentTypeLabels,
  auditAction: auditActionLabels,
  entityType: entityTypeLabels,
  status: statusLabels,
};

/** Univerzální překlad hodnoty enumu na český popisek. */
export function translateEnumLabel(map: LabelMap, value?: string | null): string {
  if (!value) return "–";
  return maps[map][value] ?? value;
}
