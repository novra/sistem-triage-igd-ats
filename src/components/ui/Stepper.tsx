import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const activeTab = tabRefs.current[activeStep];
    if (!viewport || !activeTab) return;

    const targetLeft = activeTab.offsetLeft - (viewport.clientWidth - activeTab.offsetWidth) / 2;
    viewport.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeStep, prefersReducedMotion]);

  return (
    <nav aria-label="Tahapan formulir triase" className={`folder-stepper w-full ${accessible ? "folder-stepper--accessible" : ""}`}>
      <div ref={viewportRef} className="folder-tabs-viewport">
        <div className="folder-tabs-list" role="tablist" aria-label="Tahapan formulir">
          {steps.map((step, index) => {
            const state = index === activeStep ? "active" : index < activeStep ? "done" : "upcoming";
            return (
              <button
                ref={(node) => { tabRefs.current[index] = node; }}
                key={step.label}
                type="button"
                role="tab"
                aria-selected={state === "active"}
                aria-current={state === "active" ? "step" : undefined}
                aria-label={step.desc ? `${step.label}. ${step.desc}` : step.label}
                title={step.desc}
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick}
                className={`folder-tab folder-tab--${state} ${onStepClick ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="folder-tab__bridge" aria-hidden="true" />
                <span className="folder-tab__number" aria-hidden="true">
                  {state === "done" ? <Check className="size-4" /> : index + 1}
                </span>
                <span className="folder-tab__label">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
