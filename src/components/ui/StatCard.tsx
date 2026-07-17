import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

function AnimatedNumber({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const display = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString("id-ID"));

  useEffect(() => {
    if (prefersReducedMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, motionValue, prefersReducedMotion]);

  return <motion.span>{display}</motion.span>;
}

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "primary" | "secondary" | "accent" | "warning" | "danger";
  suffix?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/15 text-amber-700 dark:text-amber-400",
  danger: "bg-danger/10 text-danger",
};

export function StatCard({ icon: Icon, label, value, tone = "primary", suffix }: StatCardProps) {
  return (
    <Card padding="md" hoverLift className="flex items-center gap-3.5">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="size-5.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-black tabular-nums text-text">
          <AnimatedNumber value={value} />
          {suffix && <span className="ml-0.5 text-base font-bold text-text-muted">{suffix}</span>}
        </p>
        <p className="truncate text-xs font-semibold text-text-muted">{label}</p>
      </div>
    </Card>
  );
}
