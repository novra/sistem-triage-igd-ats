import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * role="alertdialog" confirmation surface — used for every destructive or
 * consequential action (delete, deactivate, reset) instead of native confirm().
 */
export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialogPrimitive.Portal forceMount>
            <AlertDialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              />
            </AlertDialogPrimitive.Overlay>
            <AlertDialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-4 top-1/2 z-[70] w-auto -translate-y-1/2 rounded-2xl bg-surface p-5 text-text shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  {tone === "danger" && (
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                      <AlertTriangle className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <AlertDialogPrimitive.Title className="text-lg font-bold text-text">{title}</AlertDialogPrimitive.Title>
                    {description && (
                      <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-text-muted">
                        {description}
                      </AlertDialogPrimitive.Description>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <AlertDialogPrimitive.Cancel asChild>
                    <Button variant="ghost" onClick={onCancel} disabled={loading}>
                      {cancelLabel}
                    </Button>
                  </AlertDialogPrimitive.Cancel>
                  <AlertDialogPrimitive.Action asChild>
                    <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
                      {confirmLabel}
                    </Button>
                  </AlertDialogPrimitive.Action>
                </div>
              </motion.div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </AlertDialogPrimitive.Root>
  );
}
