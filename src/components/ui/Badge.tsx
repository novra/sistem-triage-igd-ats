import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export type BadgeTone = "neutral" | "primary" | "secondary" | "accent" | "warning" | "danger" | "ats-1" | "ats-2" | "ats-3" | "ats-4" | "ats-5";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-black/5 text-text dark:bg-white/10",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  secondary: "bg-secondary/10 text-secondary dark:bg-secondary/20",
  accent: "bg-accent/10 text-accent dark:bg-accent/20",
  warning: "bg-warning/15 text-amber-800 dark:bg-warning/20 dark:text-amber-300",
  danger: "bg-danger/10 text-danger dark:bg-danger/20",
  "ats-1": "bg-ats-1 text-ats-1-foreground",
  "ats-2": "bg-ats-2 text-ats-2-foreground",
  "ats-3": "bg-ats-3 text-ats-3-foreground",
  "ats-4": "bg-ats-4 text-ats-4-foreground",
  "ats-5": "bg-ats-5 text-ats-5-foreground border border-border",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: React.ReactNode;
}

export function Badge({ tone = "neutral", icon, className = "", children, ...rest }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", TONE_CLASSES[tone], className)}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  onRemove?: () => void;
}

/** Toggleable filter/selection chip — used for symptom pickers, filter bars. */
export function Chip({ selected = false, onRemove, className = "", children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text",
        className,
      )}
      {...rest}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
          aria-label="Hapus"
        >
          <X className="size-3.5" />
        </span>
      )}
    </button>
  );
}
