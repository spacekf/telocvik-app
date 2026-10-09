import Image from "next/image";
import logo from "@/public/brand/logo-primmat.webp";
import { cn } from "@/lib/utils/cn";

/**
 * Logo školy PrimMat (bílé) z lokálního souboru.
 * Vždy umisťovat na tmavé pozadí (např. uvnitř `.brand-dark`).
 */
export function BrandLogo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt="PrimMat"
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
