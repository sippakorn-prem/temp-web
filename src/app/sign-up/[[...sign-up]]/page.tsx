"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useSignUp } from "@clerk/nextjs";
import { CircleCheckIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  FormField,
  PhoneInput,
} from "@/components/ds";
import { AuthCard, AuthShell } from "@/components/auth/auth-shell";
import { OtpStep } from "@/components/auth/otp-step";
import { PasswordField } from "@/components/ui/password-field";
import { usePhoneCountryLabels } from "@/hooks/use-phone-countries";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { cn } from "@/lib/ds-utils";
import { buildConsentRecord, recordConsent, type ConsentChoices } from "@/lib/api/consent";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, isUsablePhoneNumber } from "@/lib/phone";
import { note } from "@/lib/ui";

const STEPS = ["credentials", "consent", "email-otp", "phone-otp", "done"] as const;
type Step = (typeof STEPS)[number];

/**
 * Steps that get a progress segment. Phone verification is *deferred*, not dropped — it
 * moved to `/verify`, where it gates creating and joining a deal (DESIGN-BRIEFS.md brief 2).
 * Signing up costs one email code; the SMS is spent only on users who actually transact.
 *
 * `phone-otp` still exists as a fallback: if the Clerk instance is configured to require a
 * verified phone before a sign-up can complete, the flow falls into it and the stepper
 * grows a fourth segment rather than dead-ending.
 */
const BASE_PROGRESS_STEPS = ["credentials", "consent", "email-otp"] as const;

const credentialsSchema = z.object({
  email: z.email().or(z.literal("")),
  // Already E.164 by the time it lands here — PhoneInput converts. Checked against the
  // real numbering plan so an incomplete number fails on the field rather than coming
  // back from Clerk as a generic complaint.
  phone: z.string().refine((v) => v === "" || isUsablePhoneNumber(v)),
  password: z.string().min(8).or(z.literal("")),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

/**
 * Headless sign-up (DESIGN-BRIEFS.md section B + brief 1). Clerk creates the user and
 * runs the OTP challenges; the stepper, the consent gate and every control are ours.
 *
 * Order matters: Clerk collects credentials first (its bot-protection widget must be
 * mounted for `signUp.create`), then we gate on explicit PDPA consent before either
 * verification runs and before any session becomes active.
 *
 * This page is also where Google lands. `/sso-callback` sends an OAuth attempt here when
 * Clerk turned it into a sign-up that still needs fields the provider didn't supply — so
 * the form asks only for what's actually missing and skips verifications Google already did.
 */
export default function SignUpPage() {
  const t = useTranslations("auth.signUp");
  const tConsent = useTranslations("consent");
  const tOtp = useTranslations("auth.otp");
  const tCommon = useTranslations("common");
  // The OAuth button says the same thing on both screens — one string, not two.
  const tSignIn = useTranslations("auth.signIn");
  const router = useRouter();
  const { signUp } = useSignUp();

  const [step, setStep] = React.useState<Step>("credentials");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [consentError, setConsentError] = React.useState(false);
  const [consent, setConsent] = React.useState<ConsentChoices>({
    termsOfService: false,
    privacyNotice: false,
    marketingEmails: false,
  });
  const consentRecord = React.useRef<ReturnType<typeof buildConsentRecord> | null>(null);
  const sessionFinalized = React.useRef(false);
  // True once *this* page created the attempt. It separates "Google dropped us back
  // mid-flow" from "the user pressed Back to fix a typo" — both have a live attempt, but
  // only the first should let Clerk's `missingFields` decide which fields are editable.
  const startedHere = React.useRef(false);

  const phoneLabels = usePhoneCountryLabels();
  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", phone: "", password: "" },
  });

  // An attempt already exists when Google (or a reload) dropped us back mid-flow. Then
  // Clerk — not us — decides which fields are still outstanding.
  const resuming =
    Boolean(signUp.id) && signUp.status === "missing_requirements" && !startedHere.current;
  const needsEmail = resuming ? signUp.missingFields.includes("email_address") : true;
  const needsPhone = resuming ? signUp.missingFields.includes("phone_number") : true;
  // On the way back the password is already on the attempt and `update()` can't change it,
  // so the field is hidden rather than rendered as a control that does nothing.
  const needsPassword = resuming
    ? signUp.missingFields.includes("password")
    : !startedHere.current;
  // SafeDeal has no username concept. If the Clerk instance requires one, no amount of
  // form-filling here will complete the sign-up — say so instead of looping.
  const COLLECTED = ["email_address", "phone_number", "password"];
  const uncollectable = signUp.missingFields.filter((f) => !COLLECTED.includes(f));

  const email = signUp.emailAddress ?? form.watch("email");
  const phone = signUp.phoneNumber ?? form.watch("phone");

  const submitCredentials = form.handleSubmit(async (values) => {
    setFormError("");
    setPending(true);
    try {
      const phoneNumber = values.phone;

      // An attempt already exists — Google started it, or the user pressed Back to correct
      // a detail. Either way `update()` amends it; re-running password() would start a
      // second attempt and throw away the external account (or the verified email).
      if (signUp.id) {
        const updated = await signUp.update({
          ...(needsEmail ? { emailAddress: values.email } : {}),
          ...(needsPhone ? { phoneNumber } : {}),
          ...(needsPassword ? { password: values.password } : {}),
        });
        if (updated.error) {
          setFormError(clerkErrorMessage(updated.error, tCommon("tryAgain")));
          return;
        }
        // Consent is already on the attempt when the user is only fixing a typo — don't
        // make them tick the boxes again, go straight to whatever is still unverified.
        // Changing an identifier resets its verification, so advance() re-sends the code.
        if (consentRecord.current) {
          await advance(setFormError);
          return;
        }
        setStep("consent");
        return;
      }

      const { error } = await signUp.password({
        emailAddress: values.email,
        password: values.password,
      });
      if (error) {
        setFormError(clerkErrorMessage(error, tCommon("tryAgain")));
        return;
      }
      startedHere.current = true;
      // The phone number is a second identifier on the same attempt; it gets its own
      // verification step after consent.
      const updated = await signUp.update({ phoneNumber });
      if (updated.error) {
        setFormError(clerkErrorMessage(updated.error, tCommon("tryAgain")));
        return;
      }
      setStep("consent");
    } finally {
      setPending(false);
    }
  });

  async function continueWithGoogle() {
    // Google returns a verified email, so this path skips the email code entirely. New users
    // come back through /sso-callback into this page's resume branch, which collects the
    // phone and — crucially — the PDPA consent before any session is finalized.
    const { error } = await signUp.sso({
      strategy: "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/sso-callback",
    });
    if (error) setFormError(clerkErrorMessage(error, tCommon("tryAgain")));
  }

  async function submitConsent() {
    if (!consent.termsOfService || !consent.privacyNotice) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setFormError("");
    setPending(true);
    try {
      // A previous direct-recording attempt may have failed after Clerk finalized
      // the session. Retry only the legal-record write; a completed sign-up can no
      // longer accept metadata updates.
      if (signUp.status === "complete" && consentRecord.current) {
        await advance(setFormError);
        return;
      }
      const record = buildConsentRecord(consent, new Date());
      // Two homes on purpose: Clerk metadata survives the flow and reaches our backend
      // through the user webhook; recordConsent() is the legal record once it exists.
      const updated = await signUp.update({ unsafeMetadata: { consent: record } });
      if (updated.error) {
        setFormError(clerkErrorMessage(updated.error, tCommon("tryAgain")));
        return;
      }
      consentRecord.current = record;
      await advance(setFormError);
    } catch {
      setFormError(tCommon("tryAgain"));
    } finally {
      setPending(false);
    }
  }

  /**
   * Hands control to whatever Clerk still wants, or finishes.
   *
   * `status === "complete"` is checked first on purpose: once Clerk is satisfied, an
   * unverified phone number is no longer this flow's problem — `/verify` picks it up before
   * the first deal. That check is what keeps the SMS from being sent here.
   */
  async function advance(reportError: (message: string) => void) {
    if (signUp.status === "complete") {
      if (!sessionFinalized.current) {
        await signUp.finalize();
        sessionFinalized.current = true;
      }
      if (!consentRecord.current) {
        reportError(tCommon("tryAgain"));
        return;
      }
      await recordConsent(consentRecord.current);
      setStep("done");
      return;
    }

    // Google hands us a verified address, so this is skipped on the OAuth path.
    if (signUp.unverifiedFields.includes("email_address")) {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        reportError(clerkErrorMessage(error, tCommon("tryAgain")));
        return;
      }
      setStep("email-otp");
      return;
    }

    // Only reached when the instance refuses to complete a sign-up without a verified
    // phone. Turn off "verify at sign-up" in Clerk → Phone to keep signup to one code.
    if (signUp.unverifiedFields.includes("phone_number")) {
      const { error } = await signUp.verifications.sendPhoneCode();
      if (error) {
        reportError(clerkErrorMessage(error, tCommon("tryAgain")));
        return;
      }
      setStep("phone-otp");
      return;
    }

    reportError(tCommon("tryAgain"));
  }

  async function submitEmailCode(code: string) {
    setOtpError("");
    setPending(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setOtpError(clerkErrorMessage(error, tOtp("errorBody")));
        return;
      }
      await advance(setOtpError);
    } finally {
      setPending(false);
    }
  }

  async function submitPhoneCode(code: string) {
    setOtpError("");
    setPending(true);
    try {
      const { error } = await signUp.verifications.verifyPhoneCode({ code });
      if (error) {
        setOtpError(clerkErrorMessage(error, tOtp("errorBody")));
        return;
      }
      await advance(setOtpError);
    } finally {
      setPending(false);
    }
  }

  // The phone segment appears only if the fallback above actually fired.
  const progressSteps: readonly string[] =
    step === "phone-otp" ? [...BASE_PROGRESS_STEPS, "phone-otp"] : BASE_PROGRESS_STEPS;
  const currentIndex = STEPS.indexOf(step);

  return (
    <AuthShell
      title={t("title")}
      width="wide"
      footer={
        step === "done" ? undefined : (
          <>
            {t("haveAccount")}{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              {t("signInLink")}
            </Link>
          </>
        )
      }
    >
      <div className="flex gap-1.5" aria-hidden>
        {progressSteps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= currentIndex ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>

      {formError ? (
        <Alert variant="error">
          <AlertTitle>{tCommon("somethingWentWrong")}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {resuming && uncollectable.length > 0 ? (
        <Alert variant="error">
          <AlertTitle>{tCommon("somethingWentWrong")}</AlertTitle>
          <AlertDescription>
            {tCommon("signUpUnsupportedField", { fields: uncollectable.join(", ") })}
          </AlertDescription>
        </Alert>
      ) : null}

      {step === "credentials" ? (
        <AuthCard>
          {/* Same order and wording as sign-in, so the button reads identically wherever
              you meet it. Hidden on the resume path — you arrived here *via* Google. */}
          {resuming ? null : (
            <>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={continueWithGoogle}
              >
                {tSignIn("google")}
              </Button>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {tCommon("or")}
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submitCredentials} className="grid gap-4">
            {needsEmail ? (
              // Distinct key from the read-only branch: the editable field is uncontrolled
              // (RHF `register`, no `value`) and the context field is controlled (`value`).
              // They sit at the same position, so without separate keys React reuses one
              // `<input>` fiber when Clerk flips `needsEmail` after hydration — and warns
              // that an uncontrolled input became controlled. Separate keys remount instead.
              <FormField
                key="email-field"
                label={t("emailLabel")}
                placeholder={t("emailPlaceholder")}
                type="email"
                autoComplete="email"
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />
            ) : (
              // Came from Google — the address is settled, so show it as context, not a field.
              <FormField key="email-context" label={t("emailLabel")} value={email} readOnly disabled />
            )}
            {needsPhone ? (
              // Controller, not register: PhoneInput emits the E.164 string rather than a
              // change event, because the number shown and the number stored differ.
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput
                    label={t("phoneLabel")}
                    placeholder={t("phonePlaceholder")}
                    labels={phoneLabels}
                    countries={PHONE_COUNTRIES}
                    defaultCountry={DEFAULT_PHONE_COUNTRY}
                    countryLabel={tCommon("countryCode")}
                    searchPlaceholder={tCommon("searchCountries")}
                    emptyText={tCommon("noCountries")}
                    autoComplete="tel"
                    hint={
                      field.value ? t("phoneSavedAs", { number: field.value }) : t("phoneHint")
                    }
                    error={form.formState.errors.phone ? t("phoneInvalid") : undefined}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                )}
              />
            ) : null}
            {needsPassword ? (
              <PasswordField
                label={t("passwordLabel")}
                hint={t("passwordHint")}
                placeholder="••••••••"
                autoComplete="new-password"
                error={form.formState.errors.password?.message}
                {...form.register("password")}
              />
            ) : null}

            {/* Clerk mounts its bot-protection challenge into this node. It must exist in
                the DOM before signUp.password() runs — the design reserves the slot here.
                A resumed OAuth attempt has already cleared the challenge. */}
            {resuming ? null : (
              <div
                id="clerk-captcha"
                className="rounded-lg border border-dashed border-input p-3.5 text-center text-xs text-muted-foreground"
              >
                {t("botSlot")}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {t("cta")}
            </Button>
          </form>
        </AuthCard>
      ) : null}

      {step === "consent" ? (
        <AuthCard>
          <div>
            <h2 className="mb-1 text-[17px] font-semibold">{tConsent("title")}</h2>
            <p className={note}>{tConsent("body")}</p>
          </div>

          {consentError ? (
            <Alert variant="error">
              <AlertTitle>{tConsent("errorTitle")}</AlertTitle>
              <AlertDescription>{tConsent("errorBody")}</AlertDescription>
            </Alert>
          ) : null}

          <ConsentCheckbox
            checked={consent.termsOfService}
            onChange={(v) => setConsent((c) => ({ ...c, termsOfService: v }))}
          >
            {tConsent("tos")}{" "}
            <Link href="/legal/terms" className="text-primary hover:underline">
              {tConsent("tosLink")}
            </Link>{" "}
            <span className="text-destructive">*</span>
          </ConsentCheckbox>

          <ConsentCheckbox
            checked={consent.privacyNotice}
            onChange={(v) => setConsent((c) => ({ ...c, privacyNotice: v }))}
          >
            {tConsent("privacy")}{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              {tConsent("privacyLink")}
            </Link>{" "}
            <span className="text-destructive">*</span>
          </ConsentCheckbox>

          <ConsentCheckbox
            checked={consent.marketingEmails}
            onChange={(v) => setConsent((c) => ({ ...c, marketingEmails: v }))}
          >
            {tConsent("marketing")}{" "}
            <span className="text-muted-foreground">{tCommon("optional")}</span>
          </ConsentCheckbox>

          <Button size="lg" className="w-full" loading={pending} onClick={submitConsent}>
            {tConsent("cta")}
          </Button>

          <button
            type="button"
            onClick={() => setStep("credentials")}
            className="text-center text-xs text-primary underline-offset-2 hover:underline"
          >
            {tCommon("back")}
          </button>
        </AuthCard>
      ) : null}

      {step === "email-otp" ? (
        <OtpStep
          title={t("verifyEmailTitle")}
          destination={email}
          submitLabel={t("verifyEmailCta")}
          error={otpError}
          pending={pending}
          onSubmit={submitEmailCode}
          onResend={async () => {
            await signUp.verifications.sendEmailCode();
          }}
          footer={<BackToCredentials label={tOtp("wrongDestination")} onClick={() => setStep("credentials")} />}
        />
      ) : null}

      {step === "phone-otp" ? (
        <OtpStep
          title={t("verifyPhoneTitle")}
          destination={phone}
          submitLabel={t("verifyPhoneCta")}
          error={otpError}
          pending={pending}
          onSubmit={submitPhoneCode}
          onResend={async () => {
            await signUp.verifications.sendPhoneCode();
          }}
          footer={<BackToCredentials label={tOtp("wrongDestination")} onClick={() => setStep("credentials")} />}
        />
      ) : null}

      {step === "done" ? (
        <AuthCard>
          <EmptyState icon={CircleCheckIcon} title={t("doneTitle")}>
            {t("doneBody")}
          </EmptyState>
          <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
            {t("doneCta")}
          </Button>
        </AuthCard>
      ) : null}
    </AuthShell>
  );
}

/** The way back out of a code screen, to the form that produced the wrong destination. */
function BackToCredentials({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center text-xs text-primary underline-offset-2 hover:underline"
    >
      {label}
    </button>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-[17px] accent-primary"
      />
      <span className="text-sm">{children}</span>
    </label>
  );
}
