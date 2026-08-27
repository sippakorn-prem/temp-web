"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/ds-utils";
import { RESEND_COOLDOWN_SECONDS, type CodeFailure } from "@/lib/verification";
import { card, note } from "@/lib/ui";

/** m:ss, e.g. 47 → "0:47". */
function countdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Entering the six digits.
 *
 * The three ways this goes wrong get three different answers, because they need three
 * different actions from the user: a wrong code says try again, an expired one says get a
 * new one, and a rate-limited account says stop and wait — and locks the input, so nobody
 * burns their remaining attempts on a wall.
 *
 * "Wrong number? Change it" sits below the fold of the card on purpose but is always
 * present: a typo'd phone number is otherwise a dead end you can only escape by leaving.
 */
export function CodeStep({
  channel,
  destination,
  failure,
  message,
  cooldown,
  pending,
  onSubmit,
  onResend,
  onBack,
  onChangePhone,
}: {
  channel: "email" | "phone";
  /** Masked, e.g. "•••• 4471". */
  destination: string;
  failure: CodeFailure | null;
  /** Clerk's own wording when the failure kind is `unknown`. */
  message?: string;
  /** Seconds left before a resend is allowed; 0 when it's available. */
  cooldown: number;
  pending: boolean;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  onChangePhone: () => void;
}) {
  const t = useTranslations("verify.code");
  const [value, setValue] = React.useState("");

  // A fresh code deserves a fresh field — otherwise the rejected digits sit there looking
  // like they're still in play.
  React.useEffect(() => {
    if (failure === "expired" || failure === "ratelimited") setValue("");
  }, [failure]);

  const locked = failure === "ratelimited" || failure === "expired";
  const invalid = failure === "incorrect";

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" onClick={onBack}>
        <ChevronLeftIcon className="size-[15px]" />
        {t("back")}
      </Button>

      <section className={card}>
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className={cn(note, "mt-1.5 text-[13.5px]")}>
          {t.rich(channel === "phone" ? "sentToPhone" : "sentToEmail", {
            destination,
            d: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
          })}
        </p>

        {failure === "ratelimited" ? (
          <Alert variant="error" className="mt-4">
            <Icon name="alert" />
            <AlertTitle>{t("rateLimitedTitle")}</AlertTitle>
            <AlertDescription>{t("rateLimitedBody")}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-4.5 grid gap-2">
          <Label htmlFor="verification-code">{t("label")}</Label>
          <InputOTP
            id="verification-code"
            maxLength={6}
            value={value}
            onChange={setValue}
            disabled={locked}
            aria-invalid={invalid}
          >
            {/* The slot already reddens itself on `aria-invalid`; marking each one keeps
                that in the design system rather than re-styling it from out here. */}
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} aria-invalid={invalid} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <p
          className={cn(
            "mt-2.5 text-[13px]",
            failure === "incorrect" || failure === "unknown"
              ? "text-destructive"
              : failure === "expired"
                ? "text-warning"
                : "text-muted-foreground"
          )}
        >
          {failure === "incorrect"
            ? t("incorrect")
            : failure === "expired"
              ? t("expired")
              : failure === "unknown"
                ? (message ?? t("hint"))
                : t("hint")}
        </p>

        <div className="mt-4.5 flex flex-wrap items-center gap-2.5">
          <Button
            loading={pending}
            disabled={locked || value.length < 6}
            onClick={() => onSubmit(value)}
          >
            {t("verify")}
          </Button>
          {cooldown > 0 ? (
            <span className={cn(note, "inline-flex items-center gap-1.5 text-[13px]")}>
              <span className="font-mono">{countdown(cooldown)}</span> {t("resendIn")}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={failure === "ratelimited"}
              onClick={onResend}
            >
              {t("resend")}
            </Button>
          )}
        </div>

        {channel === "phone" ? (
          <>
            <hr className="my-4 h-px border-0 bg-border" />
            <Button variant="ghost" size="sm" onClick={onChangePhone}>
              {t("wrongNumber")}
            </Button>
          </>
        ) : null}
      </section>
    </>
  );
}

export { RESEND_COOLDOWN_SECONDS };
