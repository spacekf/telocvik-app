"use server";

import path from "path";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { runExcelImport, type FullReport } from "@/lib/import/excel-import";

export type ImportActionResult = {
  ok: boolean;
  error?: string;
  report?: FullReport;
};

/** Spustí import (ostrý nebo dry-run) všech Excel souborů ze složky /imports. */
export async function runImport(dryRun = false): Promise<ImportActionResult> {
  const teacher = await requireRole("TEACHER");

  let report: FullReport;
  try {
    report = await runExcelImport({
      dir: path.join(process.cwd(), "imports"),
      dryRun,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (!dryRun) {
    await createAuditLog({
      userId: teacher.id,
      action: "IMPORT_RUN",
      entityType: "Import",
      metadata: {
        files: report.importedFiles,
        createdUsers: report.createdUsers,
        createdStudents: report.createdStudents,
        createdEnrollments: report.createdEnrollments,
        importedAthleticsResults: report.importedAthleticsResults,
        importedFitnessResults: report.importedFitnessResults,
        importedAttendanceLessons: report.importedAttendanceLessons,
        importedAttendanceRecords: report.importedAttendanceRecords,
        errors: report.errors.length,
        defaultPasswordApplied: true,
      },
    });
  }

  revalidatePath("/ucitel/import");
  return { ok: true, report };
}
