import { cn } from "@/lib/utils/cn";

/**
 * Obal pro větší tabulky: horizontální scroll na mobilu, sticky header
 * a sticky první sloupec (přes třídu `table-sticky`). Text nikdy neuteče
 * mimo obrazovku – přeteče do scrollu.
 */
export function ResponsiveTableWrapper({
  children,
  className,
  sticky = true,
  maxHeightClass = "max-h-[70vh]",
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
  maxHeightClass?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-lg border bg-card",
        sticky && "table-sticky",
        maxHeightClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
