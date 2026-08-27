"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSignIn } from "@clerk/nextjs";
import { CircleCheckIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  FormField,
} from "@/components/ds";
import { AuthCard, AuthShell } from "@/components/auth/auth-shell";
import { OtpStep } from "@/components/auth/otp-step";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { note } from "@/lib/ui";

type Step = "request" | "otp" | "new-password" | "success";

const emailSchema = z.object({ email: z.email() });

const passwordSchema = z
  .object({ password: z.string().min(8), confirm: z.string().min(8) })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "mismatch" });

/**
 * Password reset (DESIGN-BRIEFS.md section D): email → code → new password → done.
 * Clerk drives it through the sign-in resource's reset_password_email_code strategy.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth.reset");
  const tOtp = useTranslations("auth.otp");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = React.useState<Step>("request");
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [otpError, setOtpError] = React.useState("");

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const requestCode = emailForm.handleSubmit(async ({ email: value }) => {
    setFormError("");
    setPending(true);
    try {
      // The sign-in attempt needs an identifier before a reset code can go out.
      const created = await signIn.create({ identifier: value });
      if (created.error) {
        setFormError(clerkErrorMessage(created.error, tCommon("tryAgain")));
        return;
      }
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        setFormError(clerkErrorMessage(error, tCommon("tryAgain")));
        return;
      }
      setEmail(value);
      setStep("otp");
    } finally {
      setPending(false);
    }
  });

  async function submitCode(code: string) {
    setOtpError("");
    setPending(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (error) {
        setOtpError(clerkErrorMessage(error, tOtp("errorBody")));
        return;
      }
      if (signIn.status === "needs_new_password") {
        setStep("new-password");
        return;
      }
      setOtpError(tOtp("errorBody"));
    } finally {
      setPending(false);
    }
  }

  const submitPassword = passwordForm.handleSubmit(async ({ password }) => {
    setFormError("");
    setPending(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (error) {
        setFormError(clerkErrorMessage(error, tCommon("tryAgain")));
        return;
      }
      if (signIn.status === "complete") {
        // Clerk hands back a session; activate it so "back to sign in" is a formality
        // rather than a second password entry.
        await signIn.finalize();
      }
      setStep("success");
    } finally {
      setPending(false);
    }
  });

  if (step === "otp") {
    return (
      <AuthShell>
        <OtpStep
          title={t("otpTitle")}
          destination={email}
          submitLabel={t("otpCta")}
          error={otpError}
          pending={pending}
          onSubmit={submitCode}
          onResend={async () => {
            await signIn.resetPasswordEmailCode.sendCode();
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {formError ? (
        <Alert variant="error">
          <AlertTitle>{tCommon("somethingWentWrong")}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {step === "request" ? (
        <AuthCard>
          <div>
            <h1 className="mb-1 text-xl font-semibold">{t("requestTitle")}</h1>
            <p className={note}>{t("requestBody")}</p>
          </div>
          <form onSubmit={requestCode} className="grid gap-4">
            <FormField
              label={t("emailLabel")}
              placeholder={t("emailPlaceholder")}
              type="email"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register("email")}
            />
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {t("requestCta")}
            </Button>
          </form>
        </AuthCard>
      ) : null}

      {step === "new-password" ? (
        <AuthCard>
          <h1 className="text-xl font-semibold">{t("newTitle")}</h1>
          <form onSubmit={submitPassword} className="grid gap-4">
            <FormField
              label={t("newLabel")}
              hint={t("newHint")}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...passwordForm.register("password")}
            />
            <FormField
              label={t("confirmLabel")}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={
                passwordForm.formState.errors.confirm ? t("confirmMismatch") : undefined
              }
              {...passwordForm.register("confirm")}
            />
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {t("newCta")}
            </Button>
          </form>
        </AuthCard>
      ) : null}

      {step === "success" ? (
        <AuthCard>
          <EmptyState icon={CircleCheckIcon} title={t("successTitle")}>
            {t("successBody")}
          </EmptyState>
          <Button size="lg" className="w-full" onClick={() => router.push("/sign-in")}>
            {t("successCta")}
          </Button>
        </AuthCard>
      ) : null}
    </AuthShell>
  );
}
