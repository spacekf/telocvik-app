"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Ruční obnovení server dat bez full page reloadu.
 *
 * Používá `router.refresh()` v `startTransition`, takže se znovu načtou data
 * server komponenty, ale zachová se URL, search params, filtry i lokální stav.
 * Během obnovování je tlačítko disabled a ikona se točí (nelze spamovat).
 *
 * Varianty: `<RefreshButton />` (ikona + text „Obnovit") nebo
 * `<RefreshButton iconOnly />` (jen ikona pro menší sekce / card headery).
 */
export function RefreshButton({
  label = "Obnovit",
  title = "Obnovit data",
  size = "sm",
  iconOnly = false,
  className,
  onRefreshed,
}: {
  label?: string;
  title?: string;
  size?: "sm" | "default";
  iconOnly?: boolean;
  className?: string;
  onRefreshed?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const wasPending = useRef(false);

  // onRefreshed zavoláme až po dokončení transition (sestupná hrana isPending).
  useEffect(() => {
    if (wasPending.current && !isPending) onRefreshed?.();
    wasPending.current = isPending;
  }, [isPending, onRefreshed]);

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : size}
      disabled={isPending}
      title={title}
      aria-label={title}
      className={className}
      onClick={() =>
        startTransition(() => {
          router.refresh();
        })
      }
    >
      <RefreshCw className={cn(isPending && "animate-spin")} />
      {!iconOnly && label}
    </Button>
  );
}
