import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

export type DialogVariant = "center" | "sheet";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: DialogVariant;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showClose?: boolean;
  /** Disable outside-click / Escape dismissal — used for the blocking change-password gate. */
  dismissible?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  "2xl": "sm:max-w-4xl",
};

/**
 * Shared Dialog primitive for both centered modals and mobile bottom sheets.
 * Uses Radix's documented forceMount + AnimatePresence pattern (keyed off the
 * `open` boolean, not Radix's internal state) so exit animations complete
 * before the content actually unmounts.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = "center",
  size = "md",
  showClose = true,
  dismissible = true,
}: DialogProps) {
  const prefersReducedMotion = useReducedMotion();
  const isSheet = variant === "sheet";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                onClick={dismissible ? undefined : (event) => event.preventDefault()}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              onEscapeKeyDown={(event) => { if (!dismissible) event.preventDefault(); }}
              onPointerDownOutside={(event) => { if (!dismissible) event.preventDefault(); }}
              onInteractOutside={(event) => { if (!dismissible) event.preventDefault(); }}
              className={`fixed z-[70] flex flex-col bg-surface text-text shadow-2xl ${
                isSheet
                  ? `inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-3xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl ${SIZE_CLASSES[size]}`
                  : `inset-x-4 top-1/2 w-auto -translate-y-1/2 rounded-2xl sm:left-1/2 sm:inset-x-auto sm:w-full sm:-translate-x-1/2 ${SIZE_CLASSES[size]}`
              }`}
            >
              <motion.div
                initial={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
                animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="flex max-h-[85vh] flex-col overflow-hidden rounded-[inherit]"
              >
                {isSheet && (
                  <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
                    <span className="h-1.5 w-10 rounded-full bg-border" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2 sm:px-6">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="text-lg font-bold text-text">{title}</DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="mt-1 text-sm text-text-muted">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  {showClose && (
                    <DialogPrimitive.Close
                      className="shrink-0 rounded-full p-2 text-text-muted transition hover:bg-black/5 hover:text-text dark:hover:bg-white/10"
                      aria-label="Tutup"
                    >
                      <X className="size-5" />
                    </DialogPrimitive.Close>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
                {footer && <div className="flex items-center justify-end gap-2 border-t border-border/70 px-5 py-4 sm:px-6">{footer}</div>}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
