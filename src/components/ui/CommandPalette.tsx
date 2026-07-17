import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, Moon, Sun, Accessibility, ArrowRight } from "lucide-react";
import { MAIN_NAV_ITEMS, type ViewId } from "../../lib/navigation";

export interface CommandPaletteProps {
  isAdmin: boolean;
  onNavigate: (view: ViewId) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleAccessibility: () => void;
}

/** Cmd/Ctrl+K palette — scoped to primary navigation + a few global toggles, not a content search engine. */
export function CommandPalette({ isAdmin, onNavigate, darkMode, onToggleDarkMode, onToggleAccessibility }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="fixed left-1/2 top-24 z-[70] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-2xl"
              >
                <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
                <Command className="flex flex-col">
                  <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
                    <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
                    <Command.Input
                      autoFocus
                      placeholder="Cari halaman atau perintah..."
                      className="min-h-8 w-full border-0 bg-transparent p-0 text-sm text-text outline-none placeholder:text-text-muted"
                    />
                    <kbd className="hidden shrink-0 rounded-md border border-border bg-bg px-1.5 py-0.5 text-xs font-semibold text-text-muted sm:inline">Esc</kbd>
                  </div>
                  <Command.List className="max-h-80 overflow-y-auto p-2">
                    <Command.Empty className="py-8 text-center text-sm text-text-muted">Tidak ditemukan.</Command.Empty>
                    <Command.Group heading="Navigasi" className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-text-muted [&_[cmdk-group-items]]:mt-1.5">
                      {MAIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            onSelect={() => run(() => onNavigate(item.id))}
                            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-text data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            <ArrowRight className="size-3.5 shrink-0 opacity-0 group-data-[selected=true]:opacity-100" />
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                    <Command.Separator className="my-1.5 h-px bg-border/70" />
                    <Command.Group heading="Pengaturan" className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-text-muted [&_[cmdk-group-items]]:mt-1.5">
                      <Command.Item
                        onSelect={() => run(onToggleDarkMode)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-text data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                      >
                        {darkMode ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
                        <span>{darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"}</span>
                      </Command.Item>
                      <Command.Item
                        onSelect={() => run(onToggleAccessibility)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-text data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                      >
                        <Accessibility className="size-4 shrink-0" />
                        <span>Alihkan mode aksesibilitas</span>
                      </Command.Item>
                    </Command.Group>
                  </Command.List>
                </Command>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
