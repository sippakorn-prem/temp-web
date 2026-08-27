"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle, Button, OtpField } from "@/components/ds";
import { AuthCard } from "@/components/auth/auth-shell";
import { note } from "@/lib/ui";

const RESEND_COOLDOWN_SECONDS = 60;

/** Formats a countdown as m:ss, e.g. 47 → "0:47". */
function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The shared one-time-code card. Used by sign-up (email + phone), the standalone OTP
 * screen and password reset — every place Clerk sends a 6-digit code.
 *
 * The parent owns submission and error copy; this owns the input and the resend timer.
 */
export function OtpStep({
  title,
  destination,
  submitLabel,
  error,
  pending,
  onSubmit,
  onResend,
  footer,
}: {
  title: string;
  /** Masked destination, e.g. "•••• 4567" or "yo••••@example.com". */
  destination: string;
  submitLabel: string;
  error?: string;
  pending?: boolean;
  onSubmit: (code: string) => void;
  onResend?: () => void | Promise<void>;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("auth.otp");
  const [code, setCode] = React.useState("");
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0 || !onResend) return;
    await onResend();
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <AuthCard>
      <div>
        <h2 className="mb-1 text-[17px] font-semibold">{title}</h2>
        <p className={note}>{t("sentTo", { destination })}</p>
      </div>

      {error ? (
        <Alert variant="error">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <OtpField label={t("label")} value={code} onChange={setCode} />

      {onResend ? (
        <p className={note}>
          {t("didntGetIt")}{" "}
          {cooldown > 0 ? (
            <span>{t("resendIn", { seconds: formatCountdown(cooldown) })}</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t("resend")}
            </button>
          )}
        </p>
      ) : null}

      <Button
        size="lg"
        loading={pending}
        disabled={code.length < 6}
        onClick={() => onSubmit(code)}
      >
        {submitLabel}
      </Button>

      {footer}
    </AuthCard>
  );
}
