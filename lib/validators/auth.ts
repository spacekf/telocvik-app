import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Zadejte e-mail nebo uživatelské jméno.")
    .max(255),
  password: z.string().min(1, "Zadejte heslo.").max(255),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
