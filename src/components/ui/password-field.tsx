"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@/components/ds";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/ds-utils";

/**
 * Password input with a reveal toggle.
 *
 * Vendored because the design system has no password control — `FormFieldProps` is input
 * or textarea only, and `FormField` renders its own control, so a trailing button can't
 * be slotted into it. The markup and accessibility wiring below mirror `FormField@0.2.0`
 * so the two are indistinguishable side by side; delete this and switch through
 * `components/ds.ts` when the design system ships a password field.
 *
 * Reveal rather than a confirm-password field: an unverified typo is recoverable here
 * (the email is verified in the next step, so reset works), and confirmation invites the
 * paste-both behaviour that defeats it.
 */
export type PasswordFieldProps = Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Classes for the native input. Root classes use className. */
  controlClassName?: string;
  controlRef?: React.Ref<HTMLInputElement>;
};

export const PasswordField = React.forwardRef<HTMLDivElement, PasswordFieldProps>(
  function PasswordField(
    { label, hint, error, className, controlClassName, controlRef, id, ...inputProps },
    ref,
  ) {
    const t = useTranslations("common");
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const messageId = `${fieldId}-message`;
    const message = error ?? hint;
    const [revealed, setRevealed] = React.useState(false);

    return (
      <div ref={ref} data-slot="form-field" className={cn("grid gap-2", className)}>
        {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
        <div className="relative">
          <Input
            ref={controlRef}
            id={fieldId}
            type={revealed ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            className={cn("pr-10", controlClassName)}
            {...inputProps}
          />
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon name={revealed ? "conceal" : "reveal"} className="size-4" />
          </button>
        </div>
        {message ? (
          <small
            id={messageId}
            className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
          >
            {message}
          </small>
        ) : null}
      </div>
    );
  },
);
