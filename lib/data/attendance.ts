import "server-only";

import { prisma } from "@/lib/db/prisma";
import { calculateWeightedAttendance } from "@/lib/attendance/attendance";
import { getStudentsForClassGroup, getCurrentClassGroupId } from "./enrollment";

export async function getAttendanceCodes() {
  return prisma.attendanceCodeConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export type AttendanceLessonColumn = {
  id: string;
  date: string; // ISO
  label: string;
  title: string | null;
  durationUnits: number;
};

export type AttendanceCellData = {
  code: string;
  attendedUnits: number;
  countedUnits: number;
  note: string | null;
};

export type AttendanceTableRow = {
  studentId: string;
  studentName: string;
  cells: Record<string, AttendanceCellData>; // lessonId -> cell
  attendedUnits: number;
  countedUnits: number;
  percentage: number;
};

export type AttendanceCode = {
  code: string;
  label: string;
  countsAsPresent: boolean;
  countsInDenominator: boolean;
};

export type AttendanceTable = {
  lessons: AttendanceLessonColumn[];
  codes: AttendanceCode[];
  rows: AttendanceTableRow[];
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

export async function getTeacherAttendanceTable(
  classGroupId: string,
  termId: string,
): Promise<AttendanceTable> {
  const group = await prisma.classGroup.findUniqueOrThrow({
    where: { id: classGroupId },
    select: { schoolYearId: true },
  });
  const [lessons, students, codes] = await Promise.all([
    prisma.attendanceLesson.findMany({
      where: { classGroupId, termId },
      orderBy: { date: "asc" },
    }),
    getStudentsForClassGroup({ schoolYearId: group.schoolYearId, classGroupId }),
    getAttendanceCodes(),
  ]);

  const records = await prisma.attendanceRecord.findMany({
    where: { lessonId: { in: lessons.map((l) => l.id) } },
  });

  const rows: AttendanceTableRow[] = students.map((student) => {
    const cells: Record<string, AttendanceCellData> = {};
    const studentRecords = records.filter((r) => r.studentId === student.id);
    for (const lesson of lessons) {
      const rec = studentRecords.find((r) => r.lessonId === lesson.id);
      cells[lesson.id] = {
        code: rec?.code ?? "",
        attendedUnits: rec?.attendedUnits ?? 0,
        countedUnits: rec?.countedUnits ?? 0,
        note: rec?.note ?? null,
      };
    }
    const weighted = calculateWeightedAttendance(studentRecords);
    return {
      studentId: student.id,
      studentName: `${student.lastName} ${student.firstName}`,
      cells,
      attendedUnits: weighted.attendedUnits,
      countedUnits: weighted.countedUnits,
      percentage: weighted.percentage,
    };
  });

  return {
    lessons: lessons.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      label: l.title ? `${formatDate(l.date)} ${l.title}` : formatDate(l.date),
      title: l.title,
      durationUnits: l.durationUnits,
    })),
    codes: codes.map((c) => ({
      code: c.code,
      label: c.label,
      countsAsPresent: c.countsAsPresent,
      countsInDenominator: c.countsInDenominator,
    })),
    rows,
  };
}

export async function getStudentAttendance(studentId: string, termId?: string) {
  const currentClassGroupId = await getCurrentClassGroupId(studentId);
  if (!currentClassGroupId) {
    return {
      lessons: [],
      records: [],
      codes: [],
      percentage: 0,
      attendedUnits: 0,
      countedUnits: 0,
    };
  }

  const [lessons, codes] = await Promise.all([
    prisma.attendanceLesson.findMany({
      where: {
        classGroupId: currentClassGroupId,
        ...(termId ? { termId } : {}),
      },
      orderBy: { date: "asc" },
    }),
    getAttendanceCodes(),
  ]);

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId, lessonId: { in: lessons.map((l) => l.id) } },
  });

  const weighted = calculateWeightedAttendance(records);

  return {
    lessons: lessons.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      label: l.title ? `${formatDate(l.date)} ${l.title}` : formatDate(l.date),
      title: l.title,
      durationUnits: l.durationUnits,
    })),
    records: records.map((r) => ({
      lessonId: r.lessonId,
      code: r.code,
      attendedUnits: r.attendedUnits,
      countedUnits: r.countedUnits,
      note: r.note,
    })),
    codes: codes.map((c) => ({ code: c.code, label: c.label })),
    percentage: weighted.percentage,
    attendedUnits: weighted.attendedUnits,
    countedUnits: weighted.countedUnits,
  };
}
