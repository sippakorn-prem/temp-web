"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ds";
import { AppLayout } from "@/components/app-layout";
import {
  VerificationCentre,
  VerificationHeader,
} from "@/components/verification/verification-centre";
import { safeReturnTo } from "@/lib/verification";

/**
 * The verification centre is reached signed in, so it lives inside the app chrome rather
 * than the auth shell — being made to verify is not the same as being logged out, and
 * stripping the navigation away makes it feel like it is.
 *
 * `?next=` records the action the user was bounced out of; its presence is what makes this
 * an interruption rather than housekeeping, and it's where success sends them back to.
 */
export default function VerifyClientPage() {
  return (
    <React.Suspense fallback={<Fallback />}>
      <VerifyScreen />
    </React.Suspense>
  );
}

function VerifyScreen() {
  const params = useSearchParams();
  const next = params.get("next");
  const returnTo = safeReturnTo(next);
  const entry = next ? "action" : "account";

  return (
    <AppLayout
      // The page *is* the setup notice. Repeating it in the chrome above would be the app
      // telling someone to do the thing they are visibly in the middle of doing.
      hideSetupNotice
      toolbar={<VerificationHeader entry={entry} returnTo={returnTo} />}
    >
      <div className="mt-5 max-w-[720px]">
        <VerificationCentre entry={entry} returnTo={returnTo} />
      </div>
    </AppLayout>
  );
}

function Fallback() {
  return (
    <AppLayout hideSetupNotice>
      <div className="mt-5 max-w-[720px]">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </AppLayout>
  );
}
