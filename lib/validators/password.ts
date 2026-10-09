import { z } from "zod";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/auth/default-password";

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Heslo musí mít alespoň 8 znaků.")
      .refine(
        (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v),
        "Heslo musí obsahovat malé písmeno, velké písmeno a číslici.",
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword !== DEFAULT_STUDENT_PASSWORD, {
    message: "Nové heslo nesmí být stejné jako výchozí heslo.",
    path: ["newPassword"],
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Hesla se neshodují.",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
