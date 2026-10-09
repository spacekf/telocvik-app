import "server-only";

import { headers } from "next/headers";
import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type CreateAuditLogParams = {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  /** Pokud nejsou předány, helper se je pokusí načíst z aktuálního requestu. */
  ipAddress?: string | null;
  userAgent?: string | null;
};

const asJson = (v: unknown): Prisma.InputJsonValue | undefined =>
  v == null ? undefined : (v as Prisma.InputJsonValue);

/**
 * Centrální helper pro zápis do audit logu.
 * Doplní IP adresu a User-Agent z requestu (pokud jsou dostupné a nejsou
 * předány explicitně). Volá se při každé akci měnící data.
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
): Promise<void> {
  let ipAddress = params.ipAddress ?? null;
  let userAgent = params.userAgent ?? null;

  if (ipAddress == null || userAgent == null) {
    try {
      const hdrs = await headers();
      ipAddress =
        ipAddress ??
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        hdrs.get("x-real-ip") ??
        null;
      userAgent = userAgent ?? hdrs.get("user-agent");
    } catch {
      // Mimo request scope (např. CLI) – ignorujeme.
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      oldValueJson: asJson(params.oldValue),
      newValueJson: asJson(params.newValue),
      metadataJson: asJson(params.metadata),
      ipAddress,
      userAgent,
    },
  });
}
