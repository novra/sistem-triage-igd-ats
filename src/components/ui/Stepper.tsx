import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

export interface StepDef {
  label: string;
  desc?: string;
}

export interface StepperProps {
  steps: StepDef[];
  activeStep: number;
  onStepClick?: (index: number) => void;
  /** Accessibility mode swaps the compact wrapping tabs for a wrapping grid (larger targets). */
  accessible?: boolean;
}

export function Stepper({ steps, activeStep, onStepClick, accessible = false }: StepperProps) {
  const prefersReducedMotion = useReducedMotion();
  const progressPct = steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0;

  return (
    <nav aria-label="Langkah triase" className="w-full">
      {!accessible && (
        <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-primary to-accent"
            animate={{ width: `${progressPct}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
      <div className={accessible ? "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-wrap gap-2"}>
        {steps.map((step, index) => {
          const state = index === activeStep ? "active" : index < activeStep ? "done" : "upcoming";
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              aria-current={state === "active" ? "step" : undefined}
              className={`flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left transition-colors ${
                accessible ? "w-full" : "w-48"
              } ${
                state === "active"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : state === "done"
                    ? "border-secondary/30 bg-secondary/8 text-secondary"
                    : "border-border bg-surface text-text-muted"
              } ${onStepClick ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  state === "active"
                    ? "bg-primary text-primary-foreground"
                    : state === "done"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-black/8 text-text-muted dark:bg-white/10"
                }`}
              >
                {state === "done" ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{step.label}</span>
                {step.desc && <span className="block truncate text-xs font-medium opacity-80" data-density="secondary">{step.desc}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
