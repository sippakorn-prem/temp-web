"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds";
import { Icon } from "@/components/icon";

export function DealPageActions({ canCreate, canJoin }: { canCreate: boolean; canJoin: boolean }) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
      <Button asChild variant="outline" className="whitespace-nowrap">
        <Link href={canJoin ? "/deals/join" : "/verify?returnTo=/deals/join"}>{t("joinByCode")}</Link>
      </Button>
      <CreateDealButton enabled={canCreate} />
    </div>
  );
}

/** A payout destination is required before a new deal can safely receive funds. */
export function CreateDealButton({ enabled }: { enabled: boolean }) {
  const t = useTranslations("dashboard");

  if (enabled) {
    return (
      <Button asChild className="whitespace-nowrap">
        <Link href="/deals/new">
          <Icon name="plus" className="size-4" />
          {t("createDeal")}
        </Link>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button type="button" disabled className="pointer-events-none whitespace-nowrap">
              <Icon name="plus" className="size-4" />
              {t("createDeal")}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t("createBlocked")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
