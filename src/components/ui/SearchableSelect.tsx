import React, { useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./Popover";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  label?: string;
}

/** Built on ui/Popover.tsx — Radix has no official Combobox primitive. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ditemukan.",
  disabled,
  label,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-text transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={`truncate ${selected ? "text-text" : "text-text-muted"}`}>{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) max-h-72 overflow-hidden p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-8 w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <ul role="listbox" className="max-h-56 overflow-y-auto p-1.5">
          {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-text-muted">{emptyMessage}</li>}
          {filtered.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text hover:bg-black/5 dark:hover:bg-white/8"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description && <span className="block truncate text-xs font-medium text-text-muted">{option.description}</span>}
                  </span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
