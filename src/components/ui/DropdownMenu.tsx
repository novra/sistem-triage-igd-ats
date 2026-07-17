import React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({ className = "", align = "end", ...rest }: DropdownPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={8}
        className={cn("animate-pop z-[60] min-w-48 rounded-2xl border border-border/70 bg-surface p-1.5 text-text shadow-xl", className)}
        {...rest}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className = "", danger = false, ...rest }: DropdownPrimitive.DropdownMenuItemProps & { danger?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors data-[highlighted]:bg-black/5 dark:data-[highlighted]:bg-white/8",
        danger ? "text-danger" : "text-text",
        className,
      )}
      {...rest}
    />
  );
}

export function DropdownMenuSeparator({ className = "" }: { className?: string }) {
  return <DropdownPrimitive.Separator className={cn("my-1.5 h-px bg-border/70", className)} />;
}

export function DropdownMenuLabel({ className = "", ...rest }: DropdownPrimitive.DropdownMenuLabelProps) {
  return <DropdownPrimitive.Label className={cn("px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-text-muted", className)} {...rest} />;
}
