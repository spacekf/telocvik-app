import { z } from "zod";

export const updateAttendanceSchema = z.object({
  lessonId: z.string().min(1),
  studentId: z.string().min(1),
  code: z.string().max(10),
  // Volitelné – pokud nejsou předány, odvodí se z kódu a délky hodiny.
  attendedUnits: z.coerce.number().int().min(0).max(100).optional(),
  countedUnits: z.coerce.number().int().min(0).max(100).optional(),
  note: z.string().max(200).optional(),
});

/** Rychlé režimy zápisu docházky (mapují se na kódy a / u / x / n; CLEAR = smazat). */
export const attendanceModeEnum = z.enum(["A", "U", "X", "N", "CLEAR"]);
export type AttendanceMode = z.infer<typeof attendanceModeEnum>;

/** Rychlý zápis jednoho záznamu – server odvodí hodiny z délky hodiny a kódu. */
export const quickSetAttendanceSchema = z.object({
  lessonId: z.string().min(1),
  studentId: z.string().min(1),
  mode: attendanceModeEnum,
});

/** Hromadná akce nad celou hodinou (volitelně jen pro vybrané žáky). */
export const bulkAttendanceSchema = z.object({
  lessonId: z.string().min(1),
  mode: attendanceModeEnum,
  // Pokud chybí, akce se vztahuje na všechny žáky ve skupině hodiny.
  studentIds: z.array(z.string().min(1)).max(1000).optional(),
});

export const createLessonSchema = z.object({
  classGroupId: z.string().min(1),
  termId: z.string().min(1),
  date: z.string().min(1), // ISO date (YYYY-MM-DD)
  title: z.string().max(100).optional(),
  durationUnits: z.coerce.number().int().min(1).max(100).default(2),
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type QuickSetAttendanceInput = z.infer<typeof quickSetAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
