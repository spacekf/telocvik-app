"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { updateScoringRuleSchema } from "@/lib/validators/admin";
import type { AdminResult } from "./admin";

/** Úprava jednoho bodovacího pravidla (body / hranice intervalu). */
export async function updateScoringRule(input: unknown): Promise<AdminResult> {
  await requireRole("TEACHER");
  const parsed = updateScoringRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };
  const { ruleId, points, minValue, maxValue } = parsed.data;

  await prisma.scoringRule.update({
    where: { id: ruleId },
    data: {
      points,
      minValue: minValue === undefined ? undefined : minValue,
      maxValue: maxValue === undefined ? undefined : maxValue,
    },
  });

  revalidatePath("/ucitel/bodovani");
  return { ok: true };
}
