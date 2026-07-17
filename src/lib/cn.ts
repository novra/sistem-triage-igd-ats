import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings safely: later classes win on conflicting
 * utilities (e.g. a caller's "hidden md:inline-flex" overriding a
 * component's own "inline-flex") regardless of Tailwind's internal
 * stylesheet generation order — plain template-literal concatenation does
 * NOT guarantee that, which is what caused the mobile header badge bug.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
