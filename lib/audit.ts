import "server-only";

import type { AuditAction } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/create-audit-log";

export { createAuditLog };

/**
 * Zpětně kompatibilní wrapper – deleguje na createAuditLog.
 * Nové volání preferujte přes createAuditLog (podporuje metadata + request info).
 */
export async function writeAudit(params: {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}): Promise<void> {
  await createAuditLog(params);
}
