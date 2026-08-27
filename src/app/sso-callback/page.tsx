"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Brand } from "@/components/brand";

/**
 * Landing spot for the Google OAuth redirect. Not a designed screen — Clerk finishes the
 * handshake and navigates on, so this is visible for a blink.
 *
 * Every branch needs an explicit URL. When Google returns an email with no SafeDeal account,
 * Clerk turns the sign-in into a sign-up that is missing whatever the instance requires
 * (phone, password); without `continueSignUpUrl` it bails out to Clerk's hosted Account
 * Portal, which is not our UI. Same for the factor and verification detours.
 */
export default function SsoCallbackPage() {
  return (
    <main className="grid min-h-dvh place-items-center gap-4 px-6">
      <Brand className="text-[19px] opacity-70" />
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        continueSignUpUrl="/sign-up"
        firstFactorUrl="/sign-in"
        secondFactorUrl="/sign-in"
        resetPasswordUrl="/reset-password"
        verifyEmailAddressUrl="/sign-up"
        verifyPhoneNumberUrl="/sign-up"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
