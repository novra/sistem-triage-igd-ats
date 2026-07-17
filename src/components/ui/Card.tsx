import React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/cn";

export interface CardProps extends HTMLMotionProps<"div"> {
  hoverLift?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  glass?: boolean;
}

const PADDING_CLASSES: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

/**
 * Base surface for the whole app. `data-slot="card"` gives new CSS a stable
 * hook that never collides with the legacy `.shadow-xs.rounded-2xl.bg-white`
 * class-combo hack still relied on by not-yet-migrated screens.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hoverLift = false, padding = "md", glass = false, className = "", children, ...rest }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        data-slot="card"
        whileHover={hoverLift && !prefersReducedMotion ? { y: -3 } : undefined}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-2xl border border-border/70 text-text shadow-sm shadow-slate-900/5 dark:shadow-black/20",
          glass ? "bg-surface/80 backdrop-blur-xl" : "bg-surface",
          hoverLift && "hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-black/30",
          PADDING_CLASSES[padding],
          className,
        )}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
Card.displayName = "Card";

export function CardHeader({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn("flex items-start justify-between gap-3", className)} {...rest} />;
}

export function CardTitle({ className = "", ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="card-title" className={cn("text-lg font-bold text-text", className)} {...rest} />;
}

export function CardDescription({ className = "", ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="card-description" className={cn("text-sm text-text-muted", className)} {...rest} />;
}

export function CardContent({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={className} {...rest} />;
}

export function CardFooter({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2", className)} {...rest} />;
}
