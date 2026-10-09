"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { requireTeacherClassGroupAccess } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  normalizeAttendanceCode,
  defaultUnitsForCode,
} from "@/lib/attendance/attendance";
import {
  updateAttendanceSchema,
  createLessonSchema,
  quickSetAttendanceSchema,
  bulkAttendanceSchema,
  type AttendanceMode,
} from "@/lib/validators/attendance";
import { getStudentsForClassGroup } from "@/lib/data/enrollment";

export type ActionResult<T = undefined> = {
  ok: boolean;
  error?: string;
  data?: T;
};

/**
 * Zapíše/aktualizuje docházku žáka pro hodinu – kód + vážené hodiny.
 * Pokud attendedUnits/countedUnits nejsou předány, odvodí se z kódu a délky hodiny.
 */
export async function updateAttendanceRecord(input: {
  lessonId: string;
  studentId: string;
  code: string;
  attendedUnits?: number;
  countedUnits?: number;
  note?: string;
}): Promise<
  ActionResult<{ code: string; attendedUnits: number; countedUnits: number }>
> {
  const user = await requireRole("TEACHER");

  const parsed = updateAttendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };

  const { lessonId, studentId, note } = parsed.data;
  const code = normalizeAttendanceCode(parsed.data.code);

  const lesson = await prisma.attendanceLesson.findUnique({
    where: { id: lessonId },
  });
  if (!lesson) return { ok: false, error: "Hodina neexistuje." };

  try {
    await requireTeacherClassGroupAccess(user, lesson.classGroupId);
  } catch {
    return { ok: false, error: "Nemáte oprávnění k této skupině." };
  }

  // Ověření platnosti kódu proti konfiguraci + výchozí hodiny dle kódu.
  let cfg = null;
  if (code) {
    cfg = await prisma.attendanceCodeConfig.findUnique({ where: { code } });
    if (!cfg || !cfg.isActive) {
      return { ok: false, error: "Neznámý docházkový kód." };
    }
  }

  const defaults = defaultUnitsForCode(cfg ?? undefined, lesson.durationUnits);
  // Explicitně předané hodiny mají přednost; jinak default dle kódu.
  let attendedUnits = parsed.data.attendedUnits ?? (code ? defaults.attendedUnits : 0);
  let countedUnits = parsed.data.countedUnits ?? (code ? defaults.countedUnits : 0);
  // Sanity: attended nikdy nad počítané/délku.
  countedUnits = Math.min(countedUnits, lesson.durationUnits);
  attendedUnits = Math.min(attendedUnits, lesson.durationUnits);

  const existing = await prisma.attendanceRecord.findUnique({
    where: { lessonId_studentId: { lessonId, studentId } },
  });

  const saved = await prisma.attendanceRecord.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    update: {
      code,
      attendedUnits,
      countedUnits,
      note: note ?? null,
      updatedByUserId: user.id,
    },
    create: {
      lessonId,
      studentId,
      code,
      attendedUnits,
      countedUnits,
      note: note ?? null,
      updatedByUserId: user.id,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "ATTENDANCE_UPDATE",
    entityType: "AttendanceRecord",
    entityId: saved.id,
    oldValue: existing
      ? {
          code: existing.code,
          attendedUnits: existing.attendedUnits,
          countedUnits: existing.countedUnits,
        }
      : null,
    newValue: {
      code: saved.code,
      attendedUnits: saved.attendedUnits,
      countedUnits: saved.countedUnits,
    },
    metadata: {
      studentId,
      lessonId,
      classGroupId: lesson.classGroupId,
      date: lesson.date.toISOString(),
    },
  });

  return {
    ok: true,
    data: {
      code: saved.code,
      attendedUnits: saved.attendedUnits,
      countedUnits: saved.countedUnits,
    },
  };
}

/**
 * Přeloží rychlý režim (A/U/X/N/CLEAR) na kód + vážené hodiny podle délky hodiny.
 * Kódy se ověřují proti AttendanceCodeConfig (zdroj pravdy). Vrací null u neznámého kódu.
 */
async function resolveModeUnits(
  mode: AttendanceMode,
  durationUnits: number,
): Promise<{ code: string; attendedUnits: number; countedUnits: number } | null> {
  if (mode === "CLEAR") {
    return { code: "", attendedUnits: 0, countedUnits: 0 };
  }
  const code = mode.toLowerCase();
  const cfg = await prisma.attendanceCodeConfig.findUnique({ where: { code } });
  if (!cfg || !cfg.isActive) return null;
  const units = defaultUnitsForCode(cfg, durationUnits);
  return { code, ...units };
}

/**
 * RYCHLÝ zápis docházky jedním kliknutím / cyklem. Učitel pošle jen cílový režim
 * (A/U/X/N/CLEAR); hodiny odvodí server z délky hodiny – klient se nemusí trefit.
 */
export async function quickSetAttendanceRecord(input: {
  lessonId: string;
  studentId: string;
  mode: AttendanceMode;
}): Promise<
  ActionResult<{ code: string; attendedUnits: number; countedUnits: number }>
> {
  const user = await requireRole("TEACHER");

  const parsed = quickSetAttendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };

  const { lessonId, studentId, mode } = parsed.data;

  const lesson = await prisma.attendanceLesson.findUnique({
    where: { id: lessonId },
  });
  if (!lesson) return { ok: false, error: "Hodina neexistuje." };

  try {
    await requireTeacherClassGroupAccess(user, lesson.classGroupId);
  } catch {
    return { ok: false, error: "Nemáte oprávnění k této skupině." };
  }

  const resolved = await resolveModeUnits(mode, lesson.durationUnits);
  if (!resolved) return { ok: false, error: "Neznámý docházkový kód." };

  const existing = await prisma.attendanceRecord.findUnique({
    where: { lessonId_studentId: { lessonId, studentId } },
  });

  // CLEAR = záznam smažeme (pokud existuje); jinak upsert. Poznámka zůstává zachována.
  if (mode === "CLEAR") {
    if (existing) {
      await prisma.attendanceRecord.delete({ where: { id: existing.id } });
      await createAuditLog({
        userId: user.id,
        action: "ATTENDANCE_UPDATE",
        entityType: "AttendanceRecord",
        entityId: existing.id,
        oldValue: {
          code: existing.code,
          attendedUnits: existing.attendedUnits,
          countedUnits: existing.countedUnits,
        },
        newValue: null,
        metadata: {
          studentId,
          lessonId,
          classGroupId: lesson.classGroupId,
          date: lesson.date.toISOString(),
          mode,
        },
      });
    }
    return { ok: true, data: { code: "", attendedUnits: 0, countedUnits: 0 } };
  }

  const saved = await prisma.attendanceRecord.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    update: {
      code: resolved.code,
      attendedUnits: resolved.attendedUnits,
      countedUnits: resolved.countedUnits,
      updatedByUserId: user.id,
    },
    create: {
      lessonId,
      studentId,
      code: resolved.code,
      attendedUnits: resolved.attendedUnits,
      countedUnits: resolved.countedUnits,
      updatedByUserId: user.id,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "ATTENDANCE_UPDATE",
    entityType: "AttendanceRecord",
    entityId: saved.id,
    oldValue: existing
      ? {
          code: existing.code,
          attendedUnits: existing.attendedUnits,
          countedUnits: existing.countedUnits,
        }
      : null,
    newValue: {
      code: saved.code,
      attendedUnits: saved.attendedUnits,
      countedUnits: saved.countedUnits,
    },
    metadata: {
      studentId,
      lessonId,
      classGroupId: lesson.classGroupId,
      date: lesson.date.toISOString(),
      mode,
    },
  });

  return {
    ok: true,
    data: {
      code: saved.code,
      attendedUnits: saved.attendedUnits,
      countedUnits: saved.countedUnits,
    },
  };
}

/**
 * HROMADNÁ akce nad jednou hodinou. Nastaví všem (nebo jen vybraným) žákům dané
 * skupiny stejný režim. Nikdy nezasahuje do jiné skupiny než lesson.classGroupId.
 */
export async function bulkUpdateAttendanceForLesson(input: {
  lessonId: string;
  mode: AttendanceMode;
  studentIds?: string[];
}): Promise<ActionResult<{ affected: number }>> {
  const user = await requireRole("TEACHER");

  const parsed = bulkAttendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };

  const { lessonId, mode, studentIds } = parsed.data;

  const lesson = await prisma.attendanceLesson.findUnique({
    where: { id: lessonId },
  });
  if (!lesson) return { ok: false, error: "Hodina neexistuje." };

  try {
    await requireTeacherClassGroupAccess(user, lesson.classGroupId);
  } catch {
    return { ok: false, error: "Nemáte oprávnění k této skupině." };
  }

  const resolved = await resolveModeUnits(mode, lesson.durationUnits);
  if (!resolved) return { ok: false, error: "Neznámý docházkový kód." };

  // Cíloví žáci = vždy jen žáci dané skupiny+roku (StudentEnrollment).
  const enrolled = await getStudentsForClassGroup({
    schoolYearId: lesson.schoolYearId,
    classGroupId: lesson.classGroupId,
  });
  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const targetIds = (
    studentIds && studentIds.length > 0
      ? studentIds.filter((id) => enrolledIds.has(id))
      : enrolled.map((s) => s.id)
  );

  if (targetIds.length === 0) {
    return { ok: false, error: "Žádní žáci k úpravě." };
  }

  if (mode === "CLEAR") {
    await prisma.attendanceRecord.deleteMany({
      where: { lessonId, studentId: { in: targetIds } },
    });
  } else {
    await prisma.$transaction(
      targetIds.map((studentId) =>
        prisma.attendanceRecord.upsert({
          where: { lessonId_studentId: { lessonId, studentId } },
          update: {
            code: resolved.code,
            attendedUnits: resolved.attendedUnits,
            countedUnits: resolved.countedUnits,
            updatedByUserId: user.id,
          },
          create: {
            lessonId,
            studentId,
            code: resolved.code,
            attendedUnits: resolved.attendedUnits,
            countedUnits: resolved.countedUnits,
            updatedByUserId: user.id,
          },
        }),
      ),
    );
  }

  await createAuditLog({
    userId: user.id,
    action: "ATTENDANCE_BULK_UPDATE",
    entityType: "AttendanceLesson",
    entityId: lesson.id,
    newValue: {
      code: resolved.code,
      attendedUnits: resolved.attendedUnits,
      countedUnits: resolved.countedUnits,
    },
    metadata: {
      lessonId,
      classGroupId: lesson.classGroupId,
      schoolYearId: lesson.schoolYearId,
      termId: lesson.termId,
      mode,
      affectedStudentsCount: targetIds.length,
      durationUnits: lesson.durationUnits,
      scope: studentIds && studentIds.length > 0 ? "selected" : "all",
    },
  });

  return { ok: true, data: { affected: targetIds.length } };
}

/** Vytvoří novou hodinu/datum pro docházku. */
export async function createAttendanceLesson(input: {
  classGroupId: string;
  termId: string;
  date: string;
  title?: string;
  durationUnits?: number;
}): Promise<ActionResult<{ lessonId: string }>> {
  const user = await requireRole("TEACHER");

  const parsed = createLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };

  const { classGroupId, termId, date, title, durationUnits } = parsed.data;

  try {
    await requireTeacherClassGroupAccess(user, classGroupId);
  } catch {
    return { ok: false, error: "Nemáte oprávnění k této skupině." };
  }

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
  });
  if (!group) return { ok: false, error: "Skupina neexistuje." };

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, error: "Neplatné datum." };
  }

  const lesson = await prisma.attendanceLesson.upsert({
    where: {
      classGroupId_termId_date: { classGroupId, termId, date: parsedDate },
    },
    update: { title: title ?? null, durationUnits },
    create: {
      classGroupId,
      termId,
      schoolYearId: group.schoolYearId,
      date: parsedDate,
      title: title ?? null,
      durationUnits,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "ATTENDANCE_UPDATE",
    entityType: "AttendanceLesson",
    entityId: lesson.id,
    newValue: { date: lesson.date.toISOString(), title: lesson.title },
    metadata: {
      classGroupId,
      lessonId: lesson.id,
      date: lesson.date.toISOString(),
      created: true,
    },
  });

  return { ok: true, data: { lessonId: lesson.id } };
}
