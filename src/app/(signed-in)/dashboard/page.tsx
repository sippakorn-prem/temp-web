"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { ActionCard, Button, EmptyState, Skeleton } from "@/components/ds";
import { AppLayout } from "@/components/app-layout";
import { DealRow } from "@/components/deal/deal-row";
import { DealPageActions } from "@/components/deal/deal-page-actions";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { SetupChecklist, type SetupStep } from "@/components/dashboard/setup-checklist";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { Icon, icons } from "@/components/icon";
import { ProvisioningNotice } from "@/components/provisioning-notice";
import { useDeals } from "@/hooks/use-deals";
import { usePayout } from "@/hooks/use-payout";
import { cn } from "@/lib/ds-utils";
import { isActive, needsAction, type DealSummary } from "@/lib/domain/deal";
import { formatDateTime } from "@/lib/format";
import { formatBaht } from "@/lib/money";
import { isProvisioning } from "@/lib/provisioning";
import { card, note } from "@/lib/ui";

/** The signed-in overview: setup, protected money, urgent actions, then active deals. */
export default function DashboardClientPage() {
  const t = useTranslations("dashboard");
  const deals = useDeals();
  const payout = usePayout();
  const { user } = useUser();

  const rows = deals.data ?? [];
  const hasPayout = payout.data?.status === "active";
  const emailVerified = user?.primaryEmailAddress?.verification.status === "verified";
  const phoneVerified = user?.primaryPhoneNumber?.verification.status === "verified";
  const canCreate = payout.data?.canCreateDeal === true;
  const setup: SetupStep[] = [
    {
      id: "email",
      done: emailVerified,
      href: "/verify",
    },
    {
      id: "phone",
      done: phoneVerified,
      href: "/verify",
    },
    {
      id: "payout",
      done: hasPayout,
      href: "/onboarding/payout",
    },
  ];
  const setupDone = setup.every((step) => step.done);
  const isFirstRun = deals.isSuccess && rows.length === 0;
  const active = rows.filter((deal) => isActive(deal.status));
  const actions = active.filter(needsAction);
  const inProgress = active.filter((deal) => !needsAction(deal)).slice(0, 3);

  return (
    <AppLayout
      hideSetupNotice
      toolbar={
        <>
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">{t("title")}</h1>
            <p className={cn(note, "mt-1.5 max-w-[56ch] text-sm")}>{t("subtitle")}</p>
          </div>
          <DealPageActions canCreate={canCreate} canJoin={payout.data?.canJoinDeal === true} />
        </>
      }
    >
      {deals.isPending ? <DashboardSkeleton /> : null}

      {/* Provisioning outlives the retries only when webhook delivery is broken or slow.
          Keep the skeleton — nothing is wrong with their account — but say what we're
          waiting for, and offer the retry rather than polling forever. */}
      {deals.isError && isProvisioning(deals.error) ? (
        <>
          <ProvisioningNotice onRetry={() => void deals.refetch()} />
          <DashboardSkeleton />
        </>
      ) : null}

      {deals.isError && !isProvisioning(deals.error) ? (
        <section className={cn(card, "mt-5.5")}>
          <EmptyState icon={icons.alert} tone="error" title={t("errorTitle")}>
            {t("errorBody")}
          </EmptyState>
          <div className="flex justify-center">
            <Button type="button" onClick={() => void deals.refetch()} variant="outline">
              <Icon name="history" className="size-4" />
              {t("retry")}
            </Button>
          </div>
        </section>
      ) : null}

      {deals.isSuccess && !setupDone ? (
        <div className="mt-5.5">
          <SetupChecklist steps={setup} />
        </div>
      ) : null}

      {isFirstRun ? (
        <div className="mt-5.5">
          <WelcomeCard canCreate={canCreate} />
        </div>
      ) : null}

      {deals.isSuccess && !isFirstRun ? (
        <div className="mt-5.5 grid gap-5.5">
          <DashboardStats deals={rows} />

          {actions.length > 0 ? (
            <section className="grid gap-3" aria-labelledby="dashboard-actions">
              <div className="flex items-center gap-2 px-0.5">
                <span aria-hidden className="size-[7px] rounded-full bg-warning" />
                <h2
                  id="dashboard-actions"
                  className="text-[13px] font-bold tracking-[0.06em] text-warning uppercase"
                >
                  {t("actionSection")}
                </h2>
              </div>
              {actions.map((deal) => (
                <DashboardAction key={deal.code} deal={deal} />
              ))}
            </section>
          ) : null}

          {inProgress.length > 0 ? (
            <section className="grid gap-3" aria-labelledby="dashboard-progress">
              <div className="flex items-center justify-between gap-3 px-0.5">
                <h2
                  id="dashboard-progress"
                  className="text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase"
                >
                  {t("inProgress")}
                </h2>
                <Link
                  href="/deals"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary no-underline"
                >
                  {t("viewAllDeals")}
                  <ChevronRightIcon aria-hidden className="size-4" />
                </Link>
              </div>
              {inProgress.map((deal) => (
                <DealRow key={deal.code} deal={deal} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </AppLayout>
  );
}

function DashboardAction({ deal }: { deal: DealSummary }) {
  const t = useTranslations("dashboard.actions");
  const locale = useLocale();
  const disputed = deal.status === "in_dispute";
  const key = disputed
    ? "dispute"
    : deal.role === "seller"
      ? "seller"
      : deal.status === "waiting_buyer_accept"
        ? "accept"
        : deal.status === "ready_for_payment"
          ? "payment"
          : "receipt";

  return (
    <ActionCard
      owner={t(`${key}.owner`)}
      title={t(`${key}.title`, { title: deal.title, amount: formatBaht(deal.amountSatang) })}
      problem={disputed}
      tone="action"
      iconContent={
        <Icon
          name={disputed ? "alert" : deal.role === "seller" ? "shipment" : "package"}
          className={cn("size-5", disputed && "text-error")}
        />
      }
      className={cn(
        disputed &&
          "[&_[data-slot=action-card-icon]]:bg-error-bg [&_[data-slot=action-card-icon]]:text-error"
      )}
      deadline={deal.deadline ? (formatDateTime(deal.deadline.atISO, locale) ?? undefined) : undefined}
      action={
        <Button asChild variant={disputed ? "outline" : "default"} className="w-full">
          <Link href={`/deals/${deal.code}`}>{t(`${key}.cta`)}</Link>
        </Button>
      }
    >
      {t(`${key}.body`, { amount: formatBaht(deal.amountSatang) })}
    </ActionCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-5.5 grid gap-5.5">
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
