import React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:brightness-110 active:brightness-95",
  secondary: "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/25 hover:brightness-110 active:brightness-95",
  accent: "bg-accent text-accent-foreground shadow-sm shadow-accent/25 hover:brightness-110 active:brightness-95",
  outline: "border border-border bg-surface text-text hover:bg-bg active:bg-border/40",
  ghost: "bg-transparent text-text hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/8 dark:active:bg-white/12",
  danger: "bg-danger text-danger-foreground shadow-sm shadow-danger/25 hover:brightness-110 active:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "gap-1.5 rounded-xl px-3 text-sm",
  md: "gap-2 rounded-xl px-4 text-sm",
  lg: "gap-2.5 rounded-2xl px-5 text-base",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type={rest.type ?? "button"}
        data-slot="button"
        disabled={isDisabled}
        aria-busy={loading || undefined}
        whileHover={!isDisabled && !prefersReducedMotion ? { y: -1 } : undefined}
        whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.15 }}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          fullWidth && "w-full",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...rest}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
        {children && <span className="min-w-0 whitespace-normal break-words text-center leading-snug">{children}</span>}
        {!loading && rightIcon}
      </motion.button>
    );
  },
);
Button.displayName = "Button";
