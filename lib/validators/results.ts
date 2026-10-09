import { z } from "zod";

export const updateResultSchema = z.object({
  assessmentId: z.string().min(1),
  studentId: z.string().min(1),
  disciplineId: z.string().min(1),
  // Syrová hodnota výkonu – parsuje a boduje až server.
  rawValue: z.string().max(50).nullable(),
});

export type UpdateResultInput = z.infer<typeof updateResultSchema>;
