import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Segmented-control style tab list (Apple/Material 3 pill group) with a sliding active indicator. */
export function TabsList({ items, value, className = "" }: { items: TabItem[]; value: string; className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <TabsPrimitive.List className={cn("inline-flex min-h-11 items-center gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/8", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;
        return (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="relative min-h-9 flex-1 rounded-xl px-3.5 py-1.5 text-sm font-semibold outline-none transition-colors"
          >
            {active && (
              <motion.span
                layoutId="tabs-pill"
                className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative z-10 flex items-center justify-center gap-1.5 ${active ? "text-primary-foreground" : "text-text-muted"}`}>
              {Icon && <Icon className="size-4" />}
              {item.label}
            </span>
          </TabsPrimitive.Trigger>
        );
      })}
    </TabsPrimitive.List>
  );
}
