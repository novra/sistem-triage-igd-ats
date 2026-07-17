import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Floating-label input — CSS-only via the peer + placeholder-shown trick
 * (placeholder=" " is intentional, it's what lets :placeholder-shown detect
 * "empty"). Works for text/number/date/time/email/search inputs uniformly.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = "", containerClassName = "", id, disabled, readOnly, type = "text", ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={cn("w-full", containerClassName)}>
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            placeholder=" "
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              "peer w-full rounded-xl border bg-surface pb-2 pt-5 text-sm font-medium text-text outline-none transition-colors placeholder:text-transparent",
              leftIcon ? "pl-10 pr-3.5" : "px-3.5",
              isPassword && "pr-11",
              error ? "border-danger focus:border-danger" : "border-border focus:border-primary",
              disabled && "cursor-not-allowed bg-bg text-text-muted opacity-70",
              readOnly && !disabled && "cursor-not-allowed bg-bg text-text-muted",
              className,
            )}
            {...rest}
          />
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "pointer-events-none absolute top-2 text-xs font-bold text-text-muted transition-all",
                "peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium",
                "peer-focus:top-2 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary",
                leftIcon ? "left-10" : "left-3.5",
              )}
            >
              {label}
            </label>
          )}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-muted transition hover:bg-black/5 hover:text-text dark:hover:bg-white/10"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs font-medium text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, leftIcon, className = "", containerClassName = "", id, children, ...rest }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-xs font-bold text-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">{leftIcon}</span>}
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-xl border bg-surface py-2.5 pr-9 text-sm font-medium text-text outline-none transition-colors",
              leftIcon ? "pl-10" : "pl-3.5",
              error ? "border-danger focus:border-danger" : "border-border focus:border-primary",
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>}
      </div>
    );
  },
);
SelectField.displayName = "SelectField";

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, className = "", containerClassName = "", id, ...rest }, ref) => {
    const autoId = useId();
    const areaId = id || autoId;

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label htmlFor={areaId} className="mb-1.5 block text-xs font-bold text-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            "w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm font-medium text-text outline-none transition-colors placeholder:text-text-muted/70",
            error ? "border-danger focus:border-danger" : "border-border focus:border-primary",
            className,
          )}
          {...rest}
        />
        {error && <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>}
      </div>
    );
  },
);
TextareaField.displayName = "TextareaField";
