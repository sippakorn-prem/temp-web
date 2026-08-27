"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ds";
import { AppLayout } from "@/components/app-layout";
import { DealPageActions } from "@/components/deal/deal-page-actions";
import { DealRow } from "@/components/deal/deal-row";
import { EscrowSummary } from "@/components/dashboard/escrow-summary";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { Icon, icons } from "@/components/icon";
import { ProvisioningNotice } from "@/components/provisioning-notice";
import { useDeals } from "@/hooks/use-deals";
import { usePayout } from "@/hooks/use-payout";
import { cn } from "@/lib/ds-utils";
import { isActive, needsAction } from "@/lib/domain/deal";
import { isProvisioning } from "@/lib/provisioning";
import {
  DEAL_FILTERS,
  DEAL_SORTS,
  EMPTY_QUERY,
  PAGE_SIZE,
  selectDeals,
  type DealFilter,
  type DealQuery,
  type DealSort,
} from "@/lib/domain/deal-list";
import { card, note } from "@/lib/ui";

/** The complete, searchable and action-first record of the user's deals. */
export default function DealsClientPage() {
  const t = useTranslations("dashboard");
  const tPage = useTranslations("dealsPage");
  const [query, setQuery] = React.useState<DealQuery>(EMPTY_QUERY);
  const patch = (next: Partial<DealQuery>) =>
    setQuery((previous) => ({ ...previous, page: 1, ...next }));

  const deals = useDeals();
  const payout = usePayout();
  const rows = deals.data ?? [];
  const view = selectDeals(rows, query);
  const canCreate = payout.data?.canCreateDeal === true;
  const held = rows.filter((deal) => isActive(deal.status));
  const sum = (side: "buyer" | "seller") =>
    held
      .filter((deal) => deal.role === side)
      .reduce((total, deal) => total + deal.amountSatang, 0);
  const isFirstRun = deals.isSuccess && rows.length === 0;

  return (
    <AppLayout
      toolbar={
        <>
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">{tPage("title")}</h1>
            <p className={cn(note, "mt-1.5 max-w-[56ch] text-sm")}>{tPage("subtitle")}</p>
          </div>
          <DealPageActions canCreate={canCreate} canJoin={payout.data?.canJoinDeal === true} />
        </>
      }
    >
      {deals.isPending ? <DealsSkeleton /> : null}

      {deals.isError && isProvisioning(deals.error) ? (
        <>
          <ProvisioningNotice onRetry={() => void deals.refetch()} />
          <DealsSkeleton />
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

      {isFirstRun ? (
        <div className="mt-5.5">
          <WelcomeCard canCreate={canCreate} />
        </div>
      ) : null}

      {deals.isSuccess && !isFirstRun ? (
        <>
          <div className="mt-5.5">
            <EscrowSummary
              buyerHeldSatang={sum("buyer")}
              sellerHeldSatang={sum("seller")}
              actionCount={rows.filter(needsAction).length}
            />
          </div>

          <div className="mt-5.5 flex flex-wrap items-center justify-between gap-3.5">
            <Tabs
              value={query.filter}
              onValueChange={(value) => patch({ filter: value as DealFilter })}
            >
              <TabsList aria-label={t("filterLabel")} className="h-auto flex-wrap">
                {DEAL_FILTERS.map((id) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="data-[state=active]:font-bold data-[state=active]:text-primary"
                  >
                    {t(`tabs.${id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex min-w-0 flex-[1_1_300px] flex-wrap justify-end gap-2.5">
              <div className="relative min-w-0 max-w-85 flex-[1_1_200px]">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query.search}
                  onChange={(event) => patch({ search: event.target.value })}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <select
                value={query.sort}
                onChange={(event) => patch({ sort: event.target.value as DealSort })}
                aria-label={t("sortLabel")}
                className="h-10 min-w-0 flex-[0_1_180px] rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {DEAL_SORTS.map((id) => (
                  <option key={id} value={id}>
                    {t(`sort.${id}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {view.filteredEmpty ? (
            <section className={cn(card, "mt-4")}>
              <EmptyState
                icon={icons.deals}
                tone="filtered"
                title={t("emptyFilteredTitle")}
                action={
                  <Button type="button" onClick={() => setQuery(EMPTY_QUERY)} variant="outline">
                    {t("clearFilters")}
                  </Button>
                }
              >
                {t("emptyFilteredBody")}
              </EmptyState>
            </section>
          ) : (
            <div className="mt-4 grid gap-4">
              {view.action.length > 0 ? (
                <section className="grid gap-2.5" aria-labelledby="deals-actions">
                  <div className="flex items-center gap-2 px-0.5">
                    <span aria-hidden className="size-[7px] rounded-full bg-warning" />
                    <h2
                      id="deals-actions"
                      className="text-xs font-bold tracking-[0.06em] text-warning uppercase"
                    >
                      {t("groupAction")}
                    </h2>
                    <Badge variant="warning" className="px-[7px] py-[2px] text-[11px] font-semibold">
                      {view.action.length}
                    </Badge>
                  </div>
                  {view.action.map((deal) => (
                    <DealRow key={deal.code} deal={deal} />
                  ))}
                </section>
              ) : null}

              {view.rest.length > 0 ? (
                <section className="grid gap-2.5" aria-labelledby="deals-rest">
                  {view.action.length > 0 ? (
                    <h2
                      id="deals-rest"
                      className="px-0.5 pt-0.5 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase"
                    >
                      {t("groupRest")}
                    </h2>
                  ) : null}
                  {view.rest.map((deal) => (
                    <DealRow key={deal.code} deal={deal} />
                  ))}
                </section>
              ) : null}

              {view.pageCount > 1 ? (
                <DealPagination
                  page={view.page}
                  pageCount={view.pageCount}
                  total={view.total}
                  onPage={(page) => setQuery((previous) => ({ ...previous, page }))}
                />
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </AppLayout>
  );
}

function DealPagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("dashboard");
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mt-1 grid gap-2">
      <Pagination label={t("paginationLabel")}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              label={t("previousPage")}
              ariaLabel={t("previousPageAria")}
              href="#"
              aria-disabled={page === 1}
              className={cn(page === 1 && "pointer-events-none opacity-50")}
              onClick={(event) => {
                event.preventDefault();
                onPage(page - 1);
              }}
            />
          </PaginationItem>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <PaginationItem key={number}>
              <PaginationLink
                href="#"
                isActive={number === page}
                onClick={(event) => {
                  event.preventDefault();
                  onPage(number);
                }}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              label={t("nextPage")}
              ariaLabel={t("nextPageAria")}
              href="#"
              aria-disabled={page === pageCount}
              className={cn(page === pageCount && "pointer-events-none opacity-50")}
              onClick={(event) => {
                event.preventDefault();
                onPage(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p className={cn(note, "text-center text-xs")}>{t("pageSummary", { from, to, total })}</p>
    </div>
  );
}

function DealsSkeleton() {
  return (
    <div className="mt-5.5 grid gap-5.5">
      <Skeleton className="h-24 rounded-xl" />
      <div className="flex flex-wrap justify-between gap-3">
        <Skeleton className="h-10 w-full max-w-90 rounded-lg" />
        <Skeleton className="h-10 w-full max-w-80 rounded-lg" />
      </div>
      <div className="grid gap-2.5">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-23 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
