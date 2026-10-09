import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { DEFAULT_STUDENT_PASSWORD } from "../lib/auth/default-password";
import { ALL_DISCIPLINES } from "../lib/scoring/disciplines-data";
import { DEFAULT_GRADE_RULES } from "../lib/scoring/scoring";

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === "production";

async function main() {
  console.log("🌱 Seeduji databázi...");

  // --- Docházkové kódy (konfigurovatelné v DB) ---------------------------
  // countsAsPresent = započte hodiny jako splněné; countsInDenominator = počítá do základu.
  const codes = [
    { code: "a", label: "Účast (aktivní)", countsAsPresent: true, countsInDenominator: true, sortOrder: 1 },
    { code: "u", label: "Uvolněn / uznáno", countsAsPresent: true, countsInDenominator: true, sortOrder: 2 },
    { code: "x", label: "Omluveno (nepočítá se)", countsAsPresent: false, countsInDenominator: false, sortOrder: 3 },
    { code: "n", label: "Absence (neúčast)", countsAsPresent: false, countsInDenominator: true, sortOrder: 4 },
  ];
  for (const c of codes) {
    await prisma.attendanceCodeConfig.upsert({
      where: { code: c.code },
      update: {
        label: c.label,
        countsAsPresent: c.countsAsPresent,
        countsInDenominator: c.countsInDenominator,
        sortOrder: c.sortOrder,
        isActive: true,
      },
      create: { ...c, isActive: true },
    });
  }
  console.log(`  ✓ Docházkové kódy: ${codes.map((c) => c.code).join(", ")}`);

  // --- Backfill vážené docházky u existujících záznamů -------------------
  const codeConfigs = await prisma.attendanceCodeConfig.findMany();
  const codeMap = new Map(codeConfigs.map((c) => [c.code, c]));
  const recordsToBackfill = await prisma.attendanceRecord.findMany({
    where: { countedUnits: 0, attendedUnits: 0 },
    include: { lesson: { select: { durationUnits: true } } },
  });
  let backfilled = 0;
  for (const rec of recordsToBackfill) {
    const cfg = codeMap.get(rec.code.toLowerCase());
    if (!cfg) continue;
    const dur = rec.lesson.durationUnits;
    const attendedUnits = cfg.countsAsPresent ? dur : 0;
    const countedUnits = cfg.countsInDenominator ? dur : 0;
    if (attendedUnits === 0 && countedUnits === 0) continue;
    await prisma.attendanceRecord.update({
      where: { id: rec.id },
      data: { attendedUnits, countedUnits },
    });
    backfilled++;
  }
  if (backfilled > 0) console.log(`  ✓ Backfill vážené docházky: ${backfilled} záznamů`);

  // --- Pravidla známek pro oba typy hodnocení ----------------------------
  await prisma.gradeRule.deleteMany({});
  for (const type of ["ATHLETICS", "FITNESS"] as const) {
    for (const r of DEFAULT_GRADE_RULES) {
      await prisma.gradeRule.create({
        data: {
          assessmentType: type,
          minPoints: r.minPoints,
          maxPoints: r.maxPoints,
          grade: r.grade,
          label: r.label,
        },
      });
    }
  }
  console.log("  ✓ Pravidla známek (ATHLETICS + FITNESS)");

  // --- Disciplíny + bodovací pravidla ------------------------------------
  for (const def of ALL_DISCIPLINES) {
    const discipline = await prisma.discipline.upsert({
      where: { slug_gender: { slug: def.slug, gender: def.gender } },
      update: {
        assessmentType: def.assessmentType,
        name: def.name,
        valueType: def.valueType,
        scoringDirection: def.scoringDirection,
        unit: def.unit,
        sortOrder: def.sortOrder,
        isActive: true,
      },
      create: {
        assessmentType: def.assessmentType,
        name: def.name,
        slug: def.slug,
        gender: def.gender,
        valueType: def.valueType,
        scoringDirection: def.scoringDirection,
        unit: def.unit,
        sortOrder: def.sortOrder,
      },
    });

    await prisma.scoringRule.deleteMany({ where: { disciplineId: discipline.id } });
    await prisma.scoringRule.createMany({
      data: def.bands.map((band) => ({
        disciplineId: discipline.id,
        points: band.points,
        minValue: band.min,
        maxValue: band.max,
      })),
    });
  }
  console.log(`  ✓ Disciplíny: ${ALL_DISCIPLINES.length} (vč. bodovacích pravidel)`);

  // --- Školní rok + pololetí ---------------------------------------------
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: "2025/2026" },
    update: { isActive: true },
    create: {
      name: "2025/2026",
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-06-30"),
      isActive: true,
    },
  });

  await prisma.term.upsert({
    where: { schoolYearId_order: { schoolYearId: schoolYear.id, order: 1 } },
    update: {},
    create: {
      schoolYearId: schoolYear.id,
      name: "1. pololetí",
      order: 1,
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-01-31"),
    },
  });
  await prisma.term.upsert({
    where: { schoolYearId_order: { schoolYearId: schoolYear.id, order: 2 } },
    update: {},
    create: {
      schoolYearId: schoolYear.id,
      name: "2. pololetí",
      order: 2,
      startsAt: new Date("2026-02-01"),
      endsAt: new Date("2026-06-30"),
    },
  });
  console.log("  ✓ Školní rok 2025/2026 + 2 pololetí");

  // --- Skupiny/třídy -----------------------------------------------------
  const girlsGroup = await prisma.classGroup.upsert({
    where: { schoolYearId_name: { schoolYearId: schoolYear.id, name: "3. ročník – dívky" } },
    update: {},
    create: { name: "3. ročník – dívky", schoolYearId: schoolYear.id, gradeYear: 3, gender: "GIRLS" },
  });
  const boysGroup = await prisma.classGroup.upsert({
    where: { schoolYearId_name: { schoolYearId: schoolYear.id, name: "3. ročník – chlapci" } },
    update: {},
    create: { name: "3. ročník – chlapci", schoolYearId: schoolYear.id, gradeYear: 3, gender: "BOYS" },
  });
  console.log("  ✓ Skupiny: 3. ročník – dívky / chlapci");

  // --- Úklid po zrušené roli ADMIN ---------------------------------------
  // Pokud z dřívějška existuje admin účet, převedeme ho na učitele (žádná role ADMIN).
  await prisma.user.updateMany({
    where: { OR: [{ email: "admin@telocvik.local" }, { username: "admin" }] },
    data: { role: "TEACHER" },
  });

  // --- Testovací účty (POUZE mimo produkci) ------------------------------
  // Na produkci seed žádný přihlašovací účet nezakládá – prvního učitele je
  // nutné vytvořit zvlášť při nasazení.
  if (isProduction) {
    console.log("  • Produkce: testovací účty se nezakládají.");
  } else {
    const teacherPass = await hashPassword("Ucitel123456");
    const teacherUser = await prisma.user.upsert({
      where: { email: "ucitel@telocvik.local" },
      update: {
        passwordHash: teacherPass,
        role: "TEACHER",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "ucitel@telocvik.local",
        username: "ucitel",
        passwordHash: teacherPass,
        role: "TEACHER",
        mustChangePassword: false,
      },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: teacherUser.id },
      update: {},
      create: { userId: teacherUser.id, firstName: "Jan", lastName: "Novák" },
    });
    for (const groupId of [girlsGroup.id, boysGroup.id]) {
      await prisma.teacherClassGroup.upsert({
        where: { teacherId_classGroupId: { teacherId: teacher.id, classGroupId: groupId } },
        update: {},
        create: { teacherId: teacher.id, classGroupId: groupId },
      });
    }

    const studentPass = await hashPassword(DEFAULT_STUDENT_PASSWORD);
    const studentUser = await prisma.user.upsert({
      where: { email: "student@telocvik.local" },
      update: {
        passwordHash: studentPass,
        role: "STUDENT",
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        email: "student@telocvik.local",
        username: "student",
        passwordHash: studentPass,
        role: "STUDENT",
        mustChangePassword: true,
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: { classGroupId: girlsGroup.id },
      create: {
        userId: studentUser.id,
        firstName: "Eva",
        lastName: "Svobodová",
        gender: "GIRLS",
        classGroupId: girlsGroup.id,
      },
    });

    // Enrollment testovacího žáka pro aktuální rok.
    await prisma.studentEnrollment.upsert({
      where: {
        studentId_schoolYearId: {
          studentId: student.id,
          schoolYearId: schoolYear.id,
        },
      },
      update: { classGroupId: girlsGroup.id, status: "ACTIVE" },
      create: {
        studentId: student.id,
        classGroupId: girlsGroup.id,
        schoolYearId: schoolYear.id,
        status: "ACTIVE",
      },
    });

    console.log("  ✓ Účty ucitel / student");
  }

  // --- Backfill: žáci s classGroupId, ale bez enrollmentu, dostanou enrollment.
  const studentsToBackfill = await prisma.student.findMany({
    where: { classGroupId: { not: null }, enrollments: { none: {} } },
    include: { classGroup: true },
  });
  for (const s of studentsToBackfill) {
    if (!s.classGroup) continue;
    await prisma.studentEnrollment.upsert({
      where: {
        studentId_schoolYearId: {
          studentId: s.id,
          schoolYearId: s.classGroup.schoolYearId,
        },
      },
      update: {},
      create: {
        studentId: s.id,
        classGroupId: s.classGroupId!,
        schoolYearId: s.classGroup.schoolYearId,
        status: "ACTIVE",
      },
    });
  }
  if (studentsToBackfill.length > 0) {
    console.log(`  ✓ Backfill enrollmentů: ${studentsToBackfill.length}`);
  }

  if (isProduction) {
    console.log("\n✅ Seed hotový (produkce: bez testovacích účtů).\n");
    return;
  }
  console.log("\n=========================================");
  console.log("✅ Seed hotový. Testovací přihlašovací údaje (jen lokální vývoj):");
  console.log("-----------------------------------------");
  console.log("UČITEL  | ucitel@telocvik.local  | ucitel  | Ucitel123456");
  console.log("ŽÁK     | student@telocvik.local | student | Heslo123.  (vynucená změna)");
  console.log("=========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed selhal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
