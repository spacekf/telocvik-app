import { z } from "zod";

export const createSchoolYearSchema = z.object({
  name: z
    .string()
    .min(4, "Zadejte název školního roku, např. 2026/2027.")
    .max(50),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export const rolloverSchema = z
  .object({
    sourceSchoolYearId: z.string().min(1, "Vyberte zdrojový rok."),
    targetSchoolYearId: z.string().min(1, "Vyberte cílový rok."),
    confirm: z.literal(true, {
      message: "Musíte potvrdit, že rozumíte převodu.",
    }),
  })
  .refine((d) => d.sourceSchoolYearId !== d.targetSchoolYearId, {
    message: "Zdrojový a cílový rok musí být různé.",
    path: ["targetSchoolYearId"],
  });

export type CreateSchoolYearInput = z.infer<typeof createSchoolYearSchema>;
export type RolloverInput = z.infer<typeof rolloverSchema>;
