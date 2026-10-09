import { z } from "zod";

export const updateStudentProfileSchema = z.object({
  studentId: z.string().min(1),
  firstName: z.string().min(1, "Zadejte jméno.").max(100),
  lastName: z.string().min(1, "Zadejte příjmení.").max(100),
  email: z.string().email("Neplatný e-mail.").max(255),
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky.").max(50),
});

export const updateStudentEnrollmentSchema = z.object({
  studentId: z.string().min(1),
  schoolYearId: z.string().min(1),
  newClassGroupId: z.string().min(1, "Vyberte skupinu."),
});

export const toggleStudentActiveSchema = z.object({
  studentId: z.string().min(1),
  isActive: z.boolean(),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;
export type UpdateStudentEnrollmentInput = z.infer<typeof updateStudentEnrollmentSchema>;
