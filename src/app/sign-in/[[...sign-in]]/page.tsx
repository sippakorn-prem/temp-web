"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSignIn } from "@clerk/nextjs";
import { Alert, AlertDescription, AlertTitle, Button, FormField } from "@/components/ds";
import { AuthCard, AuthShell } from "@/components/auth/auth-shell";
import { OtpStep } from "@/components/auth/otp-step";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { toE164 } from "@/lib/phone";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().optional(),
});

type Values = z.infer<typeof schema>;

/** Email addresses go down the email-code path, anything else down the SMS path. */
function isEmail(identifier: string) {
  return identifier.includes("@");
}

/**
 * Headless sign-in. Clerk owns sessions and verification; every pixel here is ours
 * (DESIGN-BRIEFS.md section A). Two first-factor paths: a password, or a one-time code
 * sent to whichever identifier the user typed.
 */
export default function SignInPage() {
  const t = useTranslations("auth.signIn");
  const tCommon = useTranslations("common");
  const tOtp = useTranslations("auth.otp");
  const router = useRouter();
  const { signIn } = useSignIn();

  const [useCode, setUseCode] = React.useState(false);
  const [codeSent, setCodeSent] = React.useState(false);
  const [destination, setDestination] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [codeError, setCodeError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  async function sendCode(identifier: string) {
    if (isEmail(identifier)) return signIn.emailCode.sendCode({ emailAddress: identifier });
    // Clerk wants E.164; the field accepts the local Thai format people type.
    return signIn.phoneCode.sendCode({ phoneNumber: toE164(identifier) ?? identifier });
  }

  const submit = form.handleSubmit(async ({ identifier, password }) => {
    setFormError("");
    setPending(true);
    try {
      if (useCode) {
        const { error } = await sendCode(identifier);
        if (error) {
          setFormError(clerkErrorMessage(error, t("errorBody")));
          return;
        }
        setDestination(identifier);
        setCodeSent(true);
        return;
      }

      const { error } = await signIn.password({
        identifier: isEmail(identifier) ? identifier : (toE164(identifier) ?? identifier),
        password: password ?? "",
      });
      if (error) {
        setFormError(clerkErrorMessage(error, t("errorBody")));
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        router.push("/dashboard");
        return;
      }
      // Second factor and the other mid-flow statuses have no design yet — say so
      // rather than leaving the user on a form that looks like it did nothing.
      setFormError(t("errorBody"));
    } finally {
      setPending(false);
    }
  });

  async function submitCode(code: string) {
    setCodeError("");
    setPending(true);
    try {
      const { error } = isEmail(destination)
        ? await signIn.emailCode.verifyCode({ code })
        : await signIn.phoneCode.verifyCode({ code });
      if (error) {
        setCodeError(clerkErrorMessage(error, tOtp("errorBody")));
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        router.push("/dashboard");
        return;
      }
      setCodeError(tOtp("errorBody"));
    } finally {
      setPending(false);
    }
  }

  async function continueWithGoogle() {
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/sso-callback",
    });
    if (error) setFormError(clerkErrorMessage(error, t("errorBody")));
  }

  if (codeSent) {
    return (
      <AuthShell>
        <OtpStep
          title={tOtp("title")}
          destination={destination}
          submitLabel={tOtp("cta")}
          error={codeError}
          pending={pending}
          onSubmit={submitCode}
          onResend={async () => {
            await sendCode(destination);
          }}
          footer={
            <button
              type="button"
              onClick={() => setCodeSent(false)}
              className="text-center text-xs text-primary underline-offset-2 hover:underline"
            >
              {tOtp("wrongDestination")}
            </button>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            {t("signUpLink")}
          </Link>
        </>
      }
    >
      {formError ? (
        <Alert variant="error">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <AuthCard>
        <form onSubmit={submit} className="grid gap-4">
          <FormField
            label={t("identifierLabel")}
            placeholder={t("identifierPlaceholder")}
            autoComplete="username"
            {...form.register("identifier")}
          />
          {useCode ? (
            <p className="-mt-1.5 text-[13px] text-muted-foreground">{t("useCode")}</p>
          ) : (
            <FormField
              label={t("passwordLabel")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...form.register("password")}
            />
          )}

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setUseCode((v) => !v)}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {useCode ? t("usePassword") : t("useCode")}
            </button>
            <Link href="/reset-password" className="text-primary hover:underline">
              {t("forgot")}
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            {useCode ? t("ctaCode") : t("cta")}
          </Button>
        </form>

        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {tCommon("or")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" size="lg" className="w-full" onClick={continueWithGoogle}>
          {t("google")}
        </Button>
      </AuthCard>
    </AuthShell>
  );
}
