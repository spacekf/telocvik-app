import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { runExcelImport, type FullReport } from "../lib/import/excel-import";
import { DEFAULT_STUDENT_PASSWORD } from "../lib/auth/default-password";

const prisma = new PrismaClient();

/**
 * Import žáků, výkonů a docházky z Excelů ve složce /imports.
 *
 *   npm run import:excel -- --dry-run   (nic nezapisuje, jen report)
 *   npm run import:excel                (ostrý import)
 */

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(
    d.getHours(),
  )}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function writeReportFile(report: FullReport): string {
  const dir = path.join(process.cwd(), "imports", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `import-report-${timestamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf-8");
  return file;
}

function printSummary(report: FullReport) {
  console.log("\n=========================================");
  console.log(`📊 Režim: ${report.mode}`);
  console.log("-----------------------------------------");
  console.log(`Soubory:                 ${report.importedFiles.length}`);
  console.log(`Noví uživatelé:          ${report.createdUsers}`);
  console.log(`Noví žáci:               ${report.createdStudents}`);
  console.log(`Aktualizovaní žáci:      ${report.updatedStudents}`);
  console.log(`Nové enrollmenty:        ${report.createdEnrollments}`);
  console.log(`Výsledky atletika:       ${report.importedAthleticsResults}`);
  console.log(`Výsledky fyz. zdatnost:  ${report.importedFitnessResults}`);
  console.log(`Hodiny docházky:         ${report.importedAttendanceLessons}`);
  console.log(`Záznamy docházky:        ${report.importedAttendanceRecords}`);
  console.log(`Přeskočené řádky:        ${report.skippedRows}`);
  console.log(`Kolize e-mailů:          ${report.duplicateEmails.length}`);
  console.log(`Nespárovaná jména:       ${report.unmatchedAttendanceNames.length}`);
  console.log(`Ignorované listy:        ${report.skippedIgnoredSheets.join(", ") || "–"}`);
  console.log(`Přeskočené kopie:        ${report.skippedDuplicateFiles.join(", ") || "–"}`);
  console.log(`Neznámé listy:           ${report.unknownSheets.length}`);
  console.log(`Chyby:                   ${report.errors.length}`);

  if (report.duplicateEmails.length > 0) {
    console.log("\n⚠️  KOLIZE E-MAILŮ (vyřešte ručně):");
    for (const d of report.duplicateEmails) {
      console.log(
        `   ${d.email}: ponechán "${d.keptStudent}", přeskočen "${d.conflictingStudent}" (${d.file})`,
      );
    }
  }
  if (report.unmatchedAttendanceNames.length > 0) {
    console.log("\n⚠️  NESPÁROVANÁ JMÉNA V DOCHÁZCE:");
    for (const u of report.unmatchedAttendanceNames) {
      console.log(`   "${u.name}" (${u.file} / ${u.sheet})`);
    }
  }
  if (report.unknownSheets.length > 0) {
    console.log("\nℹ️  NEZNÁMÉ LISTY (nerozpoznán ročník):");
    for (const s of report.unknownSheets) {
      console.log(`   ${s.file} / ${s.sheet}`);
    }
  }
  if (report.errors.length > 0) {
    console.log("\n❌ CHYBY:");
    for (const e of report.errors) console.log(`   ${e}`);
  }
  console.log("=========================================");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const dir = path.join(process.cwd(), "imports");

  console.log(
    dryRun
      ? "🔍 DRY-RUN – do databáze se nic nezapíše."
      : "📥 OSTRÝ IMPORT – zapisuji do databáze.",
  );
  console.log(`Výchozí heslo nových žáků: ${DEFAULT_STUDENT_PASSWORD} (mustChangePassword=true)`);

  let report: FullReport;
  try {
    report = await runExcelImport({ dir, dryRun });
  } catch (e) {
    console.error("\n❌ Import selhal:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  printSummary(report);
  const reportFile = writeReportFile(report);
  console.log(`\n📝 Report uložen: ${reportFile}`);

  // AuditLog jen u ostrého importu (bez hesel).
  if (!dryRun) {
    await prisma.auditLog.create({
      data: {
        action: "IMPORT_RUN",
        entityType: "Import",
        metadataJson: {
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
      },
    });
    console.log("🧾 AuditLog IMPORT_RUN zapsán.");
  }

  if (dryRun) {
    console.log("\n✅ Dry-run hotový. Ostrý import: npm run import:excel");
  } else {
    console.log("\n✅ Import dokončen.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Import selhal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
