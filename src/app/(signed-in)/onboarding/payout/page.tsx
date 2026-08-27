"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
  StatusCard,
} from "@/components/ds";
import { AppLayout } from "@/components/app-layout";
import { PayoutBankForm } from "@/components/payout/payout-bank-form";
import { usePayout, useStartPayoutOnboarding } from "@/hooks/use-payout";
import type { PayoutStatus } from "@/lib/api/payout";
import { note } from "@/lib/ui";

/** StatusCard tone per payout state — action to connect, held while Omise reviews. */
const TONE: Record<PayoutStatus, "action" | "held" | "complete" | "problem"> = {
  none: "action",
  pending: "held",
  active: "complete",
  rejected: "problem",
};

/**
 * Seller payout onboarding (DESIGN-BRIEFS.md brief 3). A deal with no connected payout
 * destination can never complete, so this runs before the first sale — and the copy says why.
 * This is the first-run standalone wall; the same {@link PayoutBankForm} is reused in-app by
 * the Account → Payouts dialog so a seller never has to leave settings to manage it.
 */
export default function PayoutOnboardingClientPage() {
  const t = useTranslations("payout");
  const router = useRouter();
  const payout = usePayout();
  const start = useStartPayoutOnboarding();

  const status = payout.data?.status ?? "none";

  // "none" and "rejected" collect bank details; "pending"/"active" only need a CTA.
  const needsBankDetails = status === "none" || status === "rejected";

  function onCta() {
    if (status === "active") {
      router.push("/dashboard");
      return;
    }
    void payout.refetch(); // pending — re-check verification
  }

  return (
    <AppLayout
      hideSetupNotice
      toolbar={
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">{t("title")}</h1>
          <p className={`${note} mt-1.5 max-w-[720px]`}>{t("intro")}</p>
        </div>
      }
    >
      <div className="mt-5 grid w-full max-w-[640px] gap-4.5">
        {payout.isPending ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <>
            <StatusCard
              state={TONE[status]}
              label={t(`status.${status}.badge`)}
              title={t(`status.${status}.title`)}
            >
              {t(`status.${status}.body`)}
            </StatusCard>

            {status === "rejected" ? (
              <Alert variant="error">
                <AlertTitle>{t("rejectedTitle")}</AlertTitle>
                <AlertDescription>
                  {payout.data?.rejectionReason ?? t("rejectedBody")}
                </AlertDescription>
              </Alert>
            ) : null}

            {needsBankDetails ? (
              <PayoutBankForm
                submitting={start.isPending}
                onSubmit={(values) => start.mutate(values)}
              />
            ) : (
              <Button
                size="lg"
                variant={status === "pending" ? "outline" : "default"}
                loading={start.isPending}
                onClick={onCta}
              >
                {t(`status.${status}.cta`)}
              </Button>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
