import React, { createContext, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-secondary/30 text-secondary",
  error: "border-danger/30 text-danger",
  info: "border-primary/30 text-primary",
  warning: "border-warning/40 text-amber-700 dark:text-amber-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { id, title, description, tone }]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const api: ToastApi = {
    success: (title, description) => push("success", title, description),
    error: (title, description) => push("error", title, description),
    info: (title, description) => push("info", title, description),
    warning: (title, description) => push("warning", title, description),
  };

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
        {children}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const Icon = TONE_ICON[item.tone];
            return (
              <ToastPrimitive.Root
                key={item.id}
                asChild
                forceMount
                onOpenChange={(open) => { if (!open) remove(item.id); }}
              >
                <motion.li
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-text shadow-lg ${TONE_CLASSES[item.tone]}`}
                >
                  <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <ToastPrimitive.Title className="text-sm font-bold text-text">{item.title}</ToastPrimitive.Title>
                    {item.description && (
                      <ToastPrimitive.Description className="mt-0.5 text-sm text-text-muted">
                        {item.description}
                      </ToastPrimitive.Description>
                    )}
                  </div>
                  <ToastPrimitive.Close className="shrink-0 rounded-full p-1 text-text-muted hover:bg-black/5 hover:text-text dark:hover:bg-white/10" aria-label="Tutup notifikasi">
                    <X className="size-4" />
                  </ToastPrimitive.Close>
                </motion.li>
              </ToastPrimitive.Root>
            );
          })}
        </AnimatePresence>
        <ToastPrimitive.Viewport className="fixed bottom-20 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 list-none flex-col gap-2 outline-none sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be used within <ToastProvider>");
  return ctx;
}
