import React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../lib/cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({ className = "", align = "start", sideOffset = 8, ...rest }: PopoverPrimitive.PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("animate-pop z-[60] rounded-2xl border border-border/70 bg-surface text-text shadow-xl outline-none", className)}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  );
}
