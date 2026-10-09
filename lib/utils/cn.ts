import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Spojení tříd s deduplikací Tailwind utilit. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
