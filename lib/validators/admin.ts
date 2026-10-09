import { z } from "zod";

export const roleEnum = z.enum(["TEACHER", "STUDENT"]);
export const genderEnum = z.enum(["GIRLS", "BOYS"]);

export const createUserSchema = z
  .object({
    email: z.string().email("Neplatný e-mail.").max(255),
    username: z.string().min(3, "Min. 3 znaky.").max(50),
    password: z.string().min(8, "Heslo musí mít alespoň 8 znaků.").max(255),
    role: roleEnum,
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    gender: genderEnum.optional(),
    classGroupId: z.string().optional(),
  })
  .refine(
    (d) => d.role !== "STUDENT" || (d.firstName && d.lastName && d.gender),
    { message: "U studenta vyplňte jméno, příjmení a pohlaví.", path: ["firstName"] },
  )
  .refine((d) => d.role !== "TEACHER" || (d.firstName && d.lastName), {
    message: "U učitele vyplňte jméno a příjmení.",
    path: ["firstName"],
  });

/** Rychlé založení žáka – e-mail, username, heslo a pohlaví doplní server. */
export const createStudentAutoSchema = z.object({
  firstName: z
    .string({ required_error: "Vyplňte jméno." })
    .trim()
    .min(1, "Vyplňte jméno.")
    .max(100),
  lastName: z
    .string({ required_error: "Vyplňte příjmení." })
    .trim()
    .min(1, "Vyplňte příjmení.")
    .max(100),
  classGroupId: z
    .string({ required_error: "Vyberte skupinu." })
    .min(1, "Vyberte skupinu."),
});

/** Hromadné založení žáků do jedné skupiny (jeden řádek = jeden žák). */
export const createStudentsBulkSchema = z.object({
  classGroupId: z
    .string({ required_error: "Vyberte skupinu." })
    .min(1, "Vyberte skupinu."),
  students: z
    .array(
      z.object({
        firstName: z.string().trim().min(1, "Vyplňte jméno.").max(100),
        lastName: z.string().trim().min(1, "Vyplňte příjmení.").max(100),
      }),
    )
    .min(1, "Vložte alespoň jednoho žáka.")
    .max(300, "Najednou lze vložit nejvýš 300 žáků."),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().max(255),
  username: z.string().min(3).max(50),
  role: roleEnum,
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků.").max(255),
});

export const createClassGroupSchema = z.object({
  name: z.string().min(1).max(100),
  schoolYearId: z.string().min(1),
  gradeYear: z.coerce.number().int().min(1).max(13),
  gender: genderEnum,
});

export const updateScoringRuleSchema = z.object({
  ruleId: z.string().min(1),
  points: z.coerce.number().int().min(0).max(100),
  minValue: z.union([z.coerce.number(), z.null()]).optional(),
  maxValue: z.union([z.coerce.number(), z.null()]).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
