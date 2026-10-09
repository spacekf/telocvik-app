import { cn } from "@/lib/utils/cn";

/** Badge s body. Readonly hodnota počítaná serverem. */
export function PointsBadge({
  points,
  className,
}: {
  points: number | null | undefined;
  className?: string;
}) {
  if (points == null) {
    return <span className="text-muted-foreground">–</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex min-w-[2rem] items-center justify-center rounded-md bg-secondary px-2 py-0.5 text-sm font-semibold text-secondary-foreground tabular-nums",
        className,
      )}
    >
      {points}
    </span>
  );
}
