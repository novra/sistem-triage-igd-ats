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
      <div className={accessible
        ? "grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-3"
        : "grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
      }>
        {steps.map((step, index) => {
          const state = index === activeStep ? "active" : index < activeStep ? "done" : "upcoming";
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              aria-current={state === "active" ? "step" : undefined}
              className={`folder-tab folder-tab--${state} flex w-full items-start gap-3 px-4 pb-3.5 pt-4 text-left ${
                accessible ? "min-h-28" : "min-h-24"
              } ${onStepClick ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`folder-tab__number relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  state === "active"
                    ? "bg-primary text-primary-foreground"
                    : state === "done"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-black/8 text-text-muted dark:bg-white/10"
                }`}
              >
                {state === "done" ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="relative z-10 min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-sm font-extrabold leading-snug [overflow-wrap:anywhere]">{step.label}</span>
                {step.desc && (
                  <span className="mt-1 block whitespace-normal break-words text-xs font-medium leading-relaxed opacity-80 [overflow-wrap:anywhere]">
                    {step.desc}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
