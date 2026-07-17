import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export const Accordion = AccordionPrimitive.Root;

export interface AccordionRowProps {
  value: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}

export function AccordionItem({ value, title, meta, children }: AccordionRowProps) {
  return (
    <AccordionPrimitive.Item value={value} className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5">
          <span className="min-w-0 flex-1 text-sm font-bold text-text sm:text-base">{title}</span>
          {meta}
          <ChevronDown className="size-4 shrink-0 text-text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="accordion-content overflow-hidden">
        <div className="px-4 pb-4 sm:px-5">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
