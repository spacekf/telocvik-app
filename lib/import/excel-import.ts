import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { AssessmentType, Gender } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/auth/default-password";
import { parsePerformanceValue, calculatePoints } from "@/lib/scoring/scoring";
import {
  ATHLETICS_COLUMN_SLUGS,
  FITNESS_COLUMN_SLUGS,
} from "@/lib/scoring/disciplines-data";
import {
  generateStudentEmail,
  studentIdentityKey,
} from "@/lib/students/generate-student-email";

type FileKind = "ATHLETICS" | "FITNESS" | "ATTENDANCE";

const GENDER_LABEL: Record<Gender, string> = { GIRLS: "dívky", BOYS: "chlapci" };
const SCHOOL_YEAR_NAME = "2025/2026";

// --------------------------------------------------------------------------
// Report typy
// --------------------------------------------------------------------------
export type PerFileSheet = {
  sheet: string;
  gradeYear: number | null;
  students: number;
  results: number;
  lessons: number;
  records: number;
  skipped: number;
};
export type PerFileReport = {
  file: string;
  kind: FileKind | "UNKNOWN";
  gender: Gender | null;
  termOrder: number | null;
  sheets: PerFileSheet[];
  error?: string;
};
export type DuplicateEmail = {
  email: string;
  keptStudent: string;
  conflictingStudent: string;
  file: string;
  sheet: string;
};
export type UnmatchedName = { name: string; file: string; sheet: string };

export type FullReport = {
  mode: "dry-run" | "import";
  startedAt: string;
  finishedAt: string;
  defaultPasswordApplied: boolean;
  importedFiles: string[];
  createdUsers: number;
  createdStudents: number;
  createdEnrollments: number;
  updatedStudents: number;
  importedAthleticsResults: number;
  importedFitnessResults: number;
  importedAttendanceLessons: number;
  importedAttendanceRecords: number;
  skippedRows: number;
  duplicateEmails: DuplicateEmail[];
  unmatchedAttendanceNames: UnmatchedName[];
  unknownSheets: { file: string; sheet: string }[];
  skippedIgnoredSheets: string[];
  skippedDuplicateFiles: string[];
  errors: string[];
  files: PerFileReport[];
};

function newReport(dryRun: boolean): FullReport {
  return {
    mode: dryRun ? "dry-run" : "import",
    startedAt: new Date().toISOString(),
    finishedAt: "",
    defaultPasswordApplied: true,
    importedFiles: [],
    createdUsers: 0,
    createdStudents: 0,
    createdEnrollments: 0,
    updatedStudents: 0,
    importedAthleticsResults: 0,
    importedFitnessResults: 0,
    importedAttendanceLessons: 0,
    importedAttendanceRecords: 0,
    skippedRows: 0,
    duplicateEmails: [],
    unmatchedAttendanceNames: [],
    unknownSheets: [],
    skippedIgnoredSheets: [],
    skippedDuplicateFiles: [],
    errors: [],
    files: [],
  };
}

/** Listy jako "Tabulky" / "Bodovací tabulky" jsou jen pomocné – ignorovat. */
export function shouldIgnoreSheet(sheetName: string): boolean {
  return sheetName.toLowerCase().includes("tabul");
}

// --------------------------------------------------------------------------
// Detekce z názvů
// --------------------------------------------------------------------------
function detectKind(fileName: string): FileKind | "UNKNOWN" {
  const n = fileName.toLowerCase();
  if (n.includes("atletika")) return "ATHLETICS";
  if (n.includes("fyzicka") || n.includes("fyzická")) return "FITNESS";
  if (n.includes("dochazka") || n.includes("docházka") || n.startsWith("doch"))
    return "ATTENDANCE";
  return "UNKNOWN";
}

function detectGender(fileName: string): Gender | null {
  const n = fileName.toLowerCase();
  if (n.includes("divky") || n.includes("dívky")) return "GIRLS";
  if (n.includes("chlapci")) return "BOYS";
  return null;
}

/** 2. pololetí podle názvu (např. "Doch-divky-2.pol.xlsx"), jinak 1. */
function detectTermOrder(fileName: string): 1 | 2 {
  const n = fileName.toLowerCase().replace(/\s+/g, "");
  if (/2\.?pol|2pol|2-pol|2_pol|2\.pololeti/.test(n)) return 2;
  return 1;
}

function detectGradeYear(sheetName: string, fileName: string): number | null {
  const fromSheet = sheetName.match(/(\d+)\.\s*ročník/i);
  if (fromSheet) return Number(fromSheet[1]);
  const fromFile = fileName.match(/(\d+)\s*R/i);
  if (fromFile) return Number(fromFile[1]);
  return null;
}

function normName(s: unknown): string {
  return String(s ?? "").trim();
}

function isHeaderRow(row: unknown[]): boolean {
  const first = normName(row[0]).toLowerCase();
  return (
    first.includes("příjmení") ||
    first.includes("prijmeni") ||
    first.includes("jméno") ||
    first.includes("jmeno") ||
    first.includes("žák") ||
    first.includes("zak")
  );
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = normName(value);
  if (!s) return null;
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})?/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : 2025;
    const d = new Date(Date.UTC(year, month, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// --------------------------------------------------------------------------
// Kontext běhu importu
// --------------------------------------------------------------------------
type Ctx = {
  dryRun: boolean;
  report: FullReport;
  schoolYearId: string;
  termIdByOrder: Record<number, string>;
  // dedup napříč soubory v rámci jednoho běhu
  emailRegistry: Map<
    string,
    {
      identityKey: string;
      studentId: string | null;
      displayName: string;
      classGroupId: string | null;
    }
  >;
  enrolledThisRun: Set<string>;
  processedResults: Set<string>;
  processedRecords: Set<string>;
  groupCache: Map<string, string | null>;
  assessmentCache: Map<string, string | null>;
  lessonCache: Map<string, string | null>;
};

async function ensureGroup(
  ctx: Ctx,
  gradeYear: number,
  gender: Gender,
): Promise<{ id: string | null; name: string }> {
  const name = `${gradeYear}. ročník – ${GENDER_LABEL[gender]}`;
  if (ctx.groupCache.has(name)) return { id: ctx.groupCache.get(name)!, name };

  const existing = await prisma.classGroup.findUnique({
    where: { schoolYearId_name: { schoolYearId: ctx.schoolYearId, name } },
  });
  let id = existing?.id ?? null;
  if (!existing && !ctx.dryRun) {
    const created = await prisma.classGroup.create({
      data: { name, schoolYearId: ctx.schoolYearId, gradeYear, gender },
    });
    id = created.id;
  }
  ctx.groupCache.set(name, id);
  return { id, name };
}

async function ensureAssessment(
  ctx: Ctx,
  groupName: string,
  groupId: string | null,
  termId: string,
  type: AssessmentType,
): Promise<string | null> {
  const key = `${groupName}|${termId}|${type}`;
  if (ctx.assessmentCache.has(key)) return ctx.assessmentCache.get(key)!;
  let id: string | null = null;
  if (groupId) {
    const existing = await prisma.assessment.findUnique({
      where: {
        classGroupId_termId_assessmentType: {
          classGroupId: groupId,
          termId,
          assessmentType: type,
        },
      },
    });
    id = existing?.id ?? null;
    if (!existing && !ctx.dryRun) {
      const created = await prisma.assessment.create({
        data: {
          classGroupId: groupId,
          schoolYearId: ctx.schoolYearId,
          termId,
          assessmentType: type,
          title: type === "ATHLETICS" ? "Atletika" : "Fyzická zdatnost",
        },
      });
      id = created.id;
    }
  }
  ctx.assessmentCache.set(key, id);
  return id;
}

type ResolveResult = {
  studentId: string | null;
  email: string | null;
  isNew: boolean;
  skip: boolean;
};

/** Najde nebo (mimo dry-run) vytvoří User + Student; řeší kolize e-mailů. */
async function resolveStudent(
  ctx: Ctx,
  firstName: string,
  lastName: string,
  gender: Gender,
  file: string,
  sheet: string,
): Promise<ResolveResult> {
  const email = generateStudentEmail(firstName, lastName);
  const identityKey = studentIdentityKey(firstName, lastName);
  const displayName = `${lastName} ${firstName}`;

  // 1) Už řešeno v tomto běhu
  const reg = ctx.emailRegistry.get(email);
  if (reg) {
    if (reg.identityKey !== identityKey) {
      ctx.report.duplicateEmails.push({
        email,
        keptStudent: reg.displayName,
        conflictingStudent: displayName,
        file,
        sheet,
      });
      ctx.report.skippedRows++;
      return { studentId: null, email, isNew: false, skip: true };
    }
    return { studentId: reg.studentId, email, isNew: false, skip: false };
  }

  // 2) Existující účet v DB podle e-mailu
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { student: true },
  });
  if (existingUser) {
    const s = existingUser.student;
    if (s && studentIdentityKey(s.firstName, s.lastName) !== identityKey) {
      ctx.report.duplicateEmails.push({
        email,
        keptStudent: `${s.lastName} ${s.firstName}`,
        conflictingStudent: displayName,
        file,
        sheet,
      });
      ctx.report.skippedRows++;
      ctx.emailRegistry.set(email, {
        identityKey: studentIdentityKey(s.firstName, s.lastName),
        studentId: s.id,
        displayName: `${s.lastName} ${s.firstName}`,
        classGroupId: null,
      });
      return { studentId: s.id, email, isNew: false, skip: true };
    }
    let studentId = s?.id ?? null;
    if (!s) {
      ctx.report.createdStudents++;
      if (!ctx.dryRun) {
        const ns = await prisma.student.create({
          data: { userId: existingUser.id, firstName, lastName, gender },
        });
        studentId = ns.id;
      }
    }
    ctx.emailRegistry.set(email, {
      identityKey,
      studentId,
      displayName,
      classGroupId: null,
    });
    return { studentId, email, isNew: !s, skip: false };
  }

  // 3) Nový účet
  ctx.report.createdUsers++;
  ctx.report.createdStudents++;
  let studentId: string | null = null;
  if (!ctx.dryRun) {
    const username = email.split("@")[0];
    const passwordHash = await hashPassword(DEFAULT_STUDENT_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      },
    });
    const student = await prisma.student.create({
      data: { userId: user.id, firstName, lastName, gender },
    });
    studentId = student.id;
  }
  ctx.emailRegistry.set(email, {
    identityKey,
    studentId,
    displayName,
    classGroupId: null,
  });
  return { studentId, email, isNew: true, skip: false };
}

async function ensureEnrollment(
  ctx: Ctx,
  resolved: ResolveResult,
  groupId: string | null,
): Promise<void> {
  if (!resolved.email) return;
  // Zapamatuj si skupinu žáka – docházka ji použije pro spárování.
  if (groupId) {
    const reg = ctx.emailRegistry.get(resolved.email);
    if (reg && !reg.classGroupId) reg.classGroupId = groupId;
  }
  const key = `${resolved.email}|${ctx.schoolYearId}`;
  if (ctx.enrolledThisRun.has(key)) return;
  ctx.enrolledThisRun.add(key);

  let exists = false;
  if (!resolved.isNew && resolved.studentId) {
    exists = Boolean(
      await prisma.studentEnrollment.findUnique({
        where: {
          studentId_schoolYearId: {
            studentId: resolved.studentId,
            schoolYearId: ctx.schoolYearId,
          },
        },
      }),
    );
  }
  if (!exists) {
    ctx.report.createdEnrollments++;
    if (!ctx.dryRun && resolved.studentId && groupId) {
      await prisma.studentEnrollment.upsert({
        where: {
          studentId_schoolYearId: {
            studentId: resolved.studentId,
            schoolYearId: ctx.schoolYearId,
          },
        },
        update: {},
        create: {
          studentId: resolved.studentId,
          classGroupId: groupId,
          schoolYearId: ctx.schoolYearId,
          status: "ACTIVE",
        },
      });
    }
  }
}

// --------------------------------------------------------------------------
// Listy
// --------------------------------------------------------------------------
async function importResultsSheet(
  ctx: Ctx,
  rows: unknown[][],
  gradeYear: number,
  gender: Gender,
  type: AssessmentType,
  termOrder: number,
  file: string,
  sheet: string,
): Promise<PerFileSheet> {
  const slugs = type === "ATHLETICS" ? ATHLETICS_COLUMN_SLUGS : FITNESS_COLUMN_SLUGS;
  const termId = ctx.termIdByOrder[termOrder];

  const disciplines = await prisma.discipline.findMany({
    where: { assessmentType: type, gender, isActive: true },
    include: { scoringRules: true },
  });
  const bySlug = new Map(disciplines.map((d) => [d.slug, d]));

  const group = await ensureGroup(ctx, gradeYear, gender);
  const assessmentId = await ensureAssessment(ctx, group.name, group.id, termId, type);

  let students = 0;
  let results = 0;
  let skipped = 0;

  for (const row of rows) {
    if (isHeaderRow(row)) continue;
    const lastName = normName(row[0]);
    const firstName = normName(row[1]);
    if (!lastName && !firstName) {
      skipped++;
      continue;
    }
    if (!lastName || !firstName) {
      ctx.report.skippedRows++;
      skipped++;
      continue;
    }

    const resolved = await resolveStudent(ctx, firstName, lastName, gender, file, sheet);
    if (resolved.skip) {
      skipped++;
      continue;
    }
    students++;
    await ensureEnrollment(ctx, resolved, group.id);

    for (let i = 0; i < slugs.length; i++) {
      const discipline = bySlug.get(slugs[i]);
      if (!discipline) continue;
      const rawValue = normName(row[2 + i * 2]);
      if (!rawValue) continue;

      const dedupKey = `${resolved.email}|${type}|${group.name}|${termOrder}|${discipline.slug}`;
      if (ctx.processedResults.has(dedupKey)) continue;
      ctx.processedResults.add(dedupKey);

      const numericValue = parsePerformanceValue(rawValue, discipline.valueType);
      const points = calculatePoints(discipline, numericValue);

      results++;
      if (type === "ATHLETICS") ctx.report.importedAthleticsResults++;
      else ctx.report.importedFitnessResults++;

      if (!ctx.dryRun && assessmentId && resolved.studentId) {
        await prisma.result.upsert({
          where: {
            assessmentId_studentId_disciplineId: {
              assessmentId,
              studentId: resolved.studentId,
              disciplineId: discipline.id,
            },
          },
          update: { rawValue, numericValue, points },
          create: {
            assessmentId,
            studentId: resolved.studentId,
            disciplineId: discipline.id,
            rawValue,
            numericValue,
            points,
          },
        });
      }
    }
  }

  return { sheet, gradeYear, students, results, lessons: 0, records: 0, skipped };
}

/** Najde už importovaného žáka podle jména (e-mailu). NEVYTVÁŘÍ nové žáky. */
async function matchExistingStudent(
  ctx: Ctx,
  firstName: string,
  lastName: string,
): Promise<{ studentId: string | null; classGroupId: string | null; email: string } | null> {
  const email = generateStudentEmail(firstName, lastName);
  const identityKey = studentIdentityKey(firstName, lastName);

  const reg = ctx.emailRegistry.get(email);
  if (reg && reg.identityKey === identityKey) {
    return { studentId: reg.studentId, classGroupId: reg.classGroupId, email };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: {
        include: {
          enrollments: { where: { schoolYearId: ctx.schoolYearId }, take: 1 },
        },
      },
    },
  });
  if (
    user?.student &&
    studentIdentityKey(user.student.firstName, user.student.lastName) === identityKey
  ) {
    const classGroupId = user.student.enrollments[0]?.classGroupId ?? null;
    ctx.emailRegistry.set(email, {
      identityKey,
      studentId: user.student.id,
      displayName: `${lastName} ${firstName}`,
      classGroupId,
    });
    return { studentId: user.student.id, classGroupId, email };
  }
  return null;
}

/** Najde/vytvoří AttendanceLesson pro skupinu+pololetí+datum (idempotentní). */
async function ensureLesson(
  ctx: Ctx,
  classGroupId: string,
  termId: string,
  date: Date,
): Promise<string | null> {
  const key = `${classGroupId}|${termId}|${date.toISOString()}`;
  if (ctx.lessonCache.has(key)) return ctx.lessonCache.get(key)!;

  const existing = await prisma.attendanceLesson.findUnique({
    where: { classGroupId_termId_date: { classGroupId, termId, date } },
  });
  let id = existing?.id ?? null;
  if (!existing && !ctx.dryRun) {
    const created = await prisma.attendanceLesson.create({
      data: { classGroupId, schoolYearId: ctx.schoolYearId, termId, date },
    });
    id = created.id;
  }
  ctx.lessonCache.set(key, id);
  ctx.report.importedAttendanceLessons++;
  return id;
}

/**
 * Docházka: list "Docházka" (bez ročníku v názvu). Žáky páruje podle jména na
 * už importované studenty a hodiny zakládá v jejich skupině pro dané pololetí.
 */
async function importAttendanceSheet(
  ctx: Ctx,
  rows: unknown[][],
  termOrder: number,
  file: string,
  sheet: string,
): Promise<PerFileSheet> {
  const termId = ctx.termIdByOrder[termOrder];

  const parseDateCols = (row: unknown[]): { col: number; date: Date }[] => {
    const out: { col: number; date: Date }[] = [];
    for (let col = 2; col < row.length; col++) {
      const date = toDate(row[col]);
      if (date) out.push({ col, date });
    }
    return out;
  };

  let students = 0;
  let records = 0;
  let skipped = 0;
  let lessons = 0;
  const lessonsSeen = new Set<string>();

  // Soubor může mít více sekcí; každá začíná řádkem s datumy ("Datum"/prázdné A).
  let dateCols: { col: number; date: Date }[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const c0 = normName(row[0]).toLowerCase();

    // Konec dat – legenda uvolněných žáků.
    if (c0.startsWith("uvolněn") || c0.startsWith("uvolnen")) break;

    // Řádek s datumy (hlavička sekce) – aktualizuj aktivní sloupce a pokračuj.
    const looksLikeHeader =
      c0 === "datum" || ((c0 === "" || c0 === ".") && toDate(row[2]) != null);
    if (looksLikeHeader) {
      dateCols = parseDateCols(row);
      continue;
    }

    const fullName = normName(row[0]);
    if (!fullName || fullName === "." || isHeaderRow(row)) {
      skipped++;
      continue;
    }
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      ctx.report.unmatchedAttendanceNames.push({ name: fullName, file, sheet });
      skipped++;
      continue;
    }
    const lastName = parts[0];
    const firstName = parts.slice(1).join(" ");

    const match = await matchExistingStudent(ctx, firstName, lastName);
    if (!match || !match.classGroupId) {
      ctx.report.unmatchedAttendanceNames.push({ name: fullName, file, sheet });
      skipped++;
      continue;
    }
    students++;

    for (const { col, date } of dateCols) {
      const code = normName(row[col]).toLowerCase();
      if (!code) continue;

      const lessonKey = `${match.classGroupId}|${termId}|${date.toISOString()}`;
      const isNewLessonThisSheet = !ctx.lessonCache.has(lessonKey);
      const lessonId = await ensureLesson(ctx, match.classGroupId, termId, date);
      if (isNewLessonThisSheet && !lessonsSeen.has(lessonKey)) {
        lessonsSeen.add(lessonKey);
        lessons++;
      }

      const recKey = `${match.email}|${date.toISOString()}`;
      if (ctx.processedRecords.has(recKey)) continue;
      ctx.processedRecords.add(recKey);

      records++;
      ctx.report.importedAttendanceRecords++;
      if (!ctx.dryRun && lessonId && match.studentId) {
        await prisma.attendanceRecord.upsert({
          where: {
            lessonId_studentId: { lessonId, studentId: match.studentId },
          },
          update: { code },
          create: { lessonId, studentId: match.studentId, code },
        });
      }
    }
  }

  return { sheet, gradeYear: null, students, results: 0, lessons, records, skipped };
}

// --------------------------------------------------------------------------
// Soubor
// --------------------------------------------------------------------------
async function importFile(ctx: Ctx, filePath: string): Promise<PerFileReport> {
  const fileName = path.basename(filePath);
  const kind = detectKind(fileName);
  const gender = detectGender(fileName);
  const termOrder = detectTermOrder(fileName);

  const report: PerFileReport = {
    file: fileName,
    kind,
    gender,
    termOrder,
    sheets: [],
  };

  if (kind === "UNKNOWN") {
    report.error = "Neznámý typ souboru (podle názvu).";
    ctx.report.errors.push(`${fileName}: neznámý typ souboru.`);
    return report;
  }
  // Pohlaví je potřeba jen u výsledků (atletika/fyzička). Docházka páruje podle jména.
  if (kind !== "ATTENDANCE" && !gender) {
    report.error = "Nepodařilo se určit pohlaví z názvu souboru.";
    ctx.report.errors.push(`${fileName}: neurčeno pohlaví.`);
    return report;
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  for (const sheetName of wb.SheetNames) {
    // Pomocné listy (bodovací tabulky) se zcela ignorují.
    if (shouldIgnoreSheet(sheetName)) {
      if (!ctx.report.skippedIgnoredSheets.includes(sheetName)) {
        ctx.report.skippedIgnoredSheets.push(sheetName);
      }
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false,
    });
    if (rows.length === 0) continue;

    // Docházka: list bez ročníku v názvu, páruje se podle jména.
    if (kind === "ATTENDANCE") {
      report.sheets.push(
        await importAttendanceSheet(ctx, rows, termOrder, fileName, sheetName),
      );
      continue;
    }

    const gradeYear = detectGradeYear(sheetName, fileName);
    if (gradeYear == null) {
      ctx.report.unknownSheets.push({ file: fileName, sheet: sheetName });
      report.sheets.push({
        sheet: sheetName,
        gradeYear: null,
        students: 0,
        results: 0,
        lessons: 0,
        records: 0,
        skipped: rows.length,
      });
      continue;
    }

    report.sheets.push(
      await importResultsSheet(ctx, rows, gradeYear, gender!, kind, termOrder, fileName, sheetName),
    );
  }

  return report;
}

// --------------------------------------------------------------------------
// Preflight + hlavní vstup
// --------------------------------------------------------------------------
async function ensurePrerequisites(
  dryRun: boolean,
): Promise<{ schoolYearId: string; termIdByOrder: Record<number, string> }> {
  const disciplineCount = await prisma.discipline.count();
  if (disciplineCount === 0) {
    throw new Error(
      "Chybí disciplíny a bodovací pravidla. Spusťte: npm run seed",
    );
  }

  let schoolYear = await prisma.schoolYear.findUnique({
    where: { name: SCHOOL_YEAR_NAME },
  });
  if (!schoolYear) {
    if (dryRun) {
      throw new Error(
        `Školní rok ${SCHOOL_YEAR_NAME} neexistuje. Spusťte: npm run seed`,
      );
    }
    schoolYear = await prisma.schoolYear.create({
      data: {
        name: SCHOOL_YEAR_NAME,
        startsAt: new Date(Date.UTC(2025, 8, 1)),
        endsAt: new Date(Date.UTC(2026, 5, 30)),
        isActive: true,
      },
    });
  }

  const terms = await prisma.term.findMany({
    where: { schoolYearId: schoolYear.id },
    orderBy: { order: "asc" },
  });
  const termIdByOrder: Record<number, string> = {};
  for (const t of terms) termIdByOrder[t.order] = t.id;

  for (const order of [1, 2]) {
    if (!termIdByOrder[order]) {
      if (dryRun) {
        throw new Error(
          `Chybí ${order}. pololetí pro ${SCHOOL_YEAR_NAME}. Spusťte: npm run seed`,
        );
      }
      const created = await prisma.term.create({
        data: {
          schoolYearId: schoolYear.id,
          name: `${order}. pololetí`,
          order,
          startsAt: new Date(Date.UTC(order === 1 ? 2025 : 2026, order === 1 ? 8 : 1, 1)),
          endsAt: new Date(Date.UTC(order === 1 ? 2026 : 2026, order === 1 ? 0 : 5, order === 1 ? 31 : 30)),
        },
      });
      termIdByOrder[order] = created.id;
    }
  }

  return { schoolYearId: schoolYear.id, termIdByOrder };
}

/** Hlavní vstup importu. dryRun = nic nezapisuje (jen čte a počítá). */
export async function runExcelImport(options: {
  dir: string;
  dryRun: boolean;
}): Promise<FullReport> {
  const { dir, dryRun } = options;
  const report = newReport(dryRun);

  if (!fs.existsSync(dir)) {
    throw new Error(`Složka ${dir} neexistuje.`);
  }

  const { schoolYearId, termIdByOrder } = await ensurePrerequisites(dryRun);

  const ctx: Ctx = {
    dryRun,
    report,
    schoolYearId,
    termIdByOrder,
    emailRegistry: new Map(),
    enrolledThisRun: new Set(),
    processedResults: new Set(),
    processedRecords: new Set(),
    groupCache: new Map(),
    assessmentCache: new Map(),
    lessonCache: new Map(),
  };

  const allFiles = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .sort();

  // Bezpečné řešení duplicit: soubor s "kopie" zpracuj jen pokud neexistuje
  // stejný soubor bez "kopie". Jinak ho přeskoč a zapiš do reportu.
  const normalizeFileName = (f: string) =>
    f.toLowerCase().replace(/\s*kopie/g, "").replace(/\s+/g, " ").trim();
  const files: string[] = [];
  for (const f of allFiles) {
    if (/kopie/i.test(f)) {
      const base = normalizeFileName(f);
      const hasOriginal = allFiles.some(
        (o) => o !== f && normalizeFileName(o) === base,
      );
      if (hasOriginal) {
        report.skippedDuplicateFiles.push(f);
        continue;
      }
    }
    files.push(f);
  }

  // Atletika/fyzička první (založí žáky), docházka potom (matchne je).
  const order = (f: string) => (detectKind(f) === "ATTENDANCE" ? 1 : 0);
  files.sort((a, b) => order(a) - order(b));

  for (const file of files) {
    try {
      const fileReport = await importFile(ctx, path.join(dir, file));
      report.files.push(fileReport);
      report.importedFiles.push(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      report.errors.push(`${file}: ${msg}`);
      report.files.push({
        file,
        kind: "UNKNOWN",
        gender: null,
        termOrder: null,
        sheets: [],
        error: msg,
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}
