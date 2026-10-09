import { cn } from "@/lib/utils/cn";
import { gradeColorClass } from "@/lib/scoring/scoring";

/** Barevný badge se známkou (1–5). */
export function GradeBadge({
  grade,
  className,
}: {
  grade: number | null | undefined;
  className?: string;
}) {
  if (grade == null) {
    return <span className="text-muted-foreground">–</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border text-sm font-bold",
        gradeColorClass(grade),
        className,
      )}
    >
      {grade}
    </span>
  );
}
