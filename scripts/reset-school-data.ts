import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Bezpečný reset školních DAT (výkony, body, známky, docházka).
 * Žáci, účty, skupiny, školní roky, disciplíny a pravidla ZŮSTÁVAJÍ.
 *
 *   npm run reset:school-data -- --dry-run              (jen vypíše počty)
 *   npm run reset:school-data -- --confirm              (ostrý reset)
 *   npm run reset:school-data -- --confirm --include-audit  (+ audit log)
 *
 * Bez --confirm se nikdy nic nesmaže.
 */

const KEPT = [
  "User",
  "Student",
  "Teacher",
  "ClassGroup",
  "StudentEnrollment",
  "SchoolYear",
  "Term",
  "Discipline",
  "ScoringRule",
  "GradeRule",
  "AttendanceCodeConfig",
  "Session",
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirm = args.includes("--confirm");
  const includeAudit = args.includes("--include-audit");
  // Bez --confirm (nebo s --dry-run) se nic nesmaže.
  const willDelete = confirm && !dryRun;

  const [resultHistory, results, assessments, attRecords, attLessons, auditLogs] =
    await Promise.all([
      prisma.resultHistory.count(),
      prisma.result.count(),
      prisma.assessment.count(),
      prisma.attendanceRecord.count(),
      prisma.attendanceLesson.count(),
      prisma.auditLog.count(),
    ]);

  console.log("=========================================");
  console.log("RESET ŠKOLNÍCH DAT");
  console.log(
    `Režim: ${dryRun ? "dry-run" : confirm ? "confirm (OSTRÝ)" : "náhled (chybí --confirm)"}`,
  );
  console.log("-----------------------------------------");
  console.log("Bude smazáno:");
  console.log(`- ResultHistory:    ${resultHistory}`);
  console.log(`- AttendanceRecord: ${attRecords}`);
  console.log(`- AttendanceLesson: ${attLessons}`);
  console.log(`- Result:           ${results}`);
  console.log(`- Assessment:       ${assessments}`);
  console.log(
    `- AuditLog:         ${includeAudit ? auditLogs : `${auditLogs} (ZACHOVÁN – bez --include-audit)`}`,
  );
  console.log("-----------------------------------------");
  console.log("Zůstane zachováno:");
  for (const t of KEPT) console.log(`- ${t}`);
  console.log("=========================================");

  if (!willDelete) {
    if (!confirm && !dryRun) {
      console.log("\n⚠️  Nic nesmazáno. Pro ostrý reset přidejte --confirm.");
    } else {
      console.log("\n🔍 Dry-run: do databáze se nic nezapsalo.");
    }
    return;
  }

  console.log("\n🗑️  Mažu data (v pořadí dle foreign keys)...");
  const deleted = await prisma.$transaction(
    async (tx) => {
      const r0 = await tx.resultHistory.deleteMany({});
      const r1 = await tx.attendanceRecord.deleteMany({});
      const r2 = await tx.attendanceLesson.deleteMany({});
      const r3 = await tx.result.deleteMany({});
      const r4 = await tx.assessment.deleteMany({});
      const r5 = includeAudit
        ? await tx.auditLog.deleteMany({})
        : { count: 0 };
      return {
        resultHistory: r0.count,
        attendanceRecords: r1.count,
        attendanceLessons: r2.count,
        results: r3.count,
        assessments: r4.count,
        auditLogs: r5.count,
      };
    },
    { timeout: 120000, maxWait: 20000 },
  );

  console.log("\n✅ Reset dokončen. Smazáno:");
  console.log(`- ResultHistory:    ${deleted.resultHistory}`);
  console.log(`- AttendanceRecord: ${deleted.attendanceRecords}`);
  console.log(`- AttendanceLesson: ${deleted.attendanceLessons}`);
  console.log(`- Result:           ${deleted.results}`);
  console.log(`- Assessment:       ${deleted.assessments}`);
  console.log(`- AuditLog:         ${deleted.auditLogs}`);
  console.log("\nŽáci, účty, skupiny, školní roky a pravidla zůstaly zachovány.");
}

main()
  .catch((e) => {
    console.error("❌ Reset selhal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
