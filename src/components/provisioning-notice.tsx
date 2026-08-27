"use client";

import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@/components/ds";
import { Icon, icons } from "@/components/icon";
import { cn } from "@/lib/ds-utils";
import { card } from "@/lib/ui";

/**
 * A just-signed-up account whose backend projection hasn't arrived yet. Deliberately not
 * an error tone: nothing failed, no deal is affected, and the same request succeeds once
 * the webhook lands. Callers pair it with their own skeleton so the page still reads as
 * loading. See lib/provisioning.ts.
 */
export function ProvisioningNotice({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("dashboard");

  return (
    <section className={cn(card, "mt-5.5")}>
      <EmptyState icon={icons.clock} title={t("provisioningTitle")}>
        {t("provisioningBody")}
      </EmptyState>
      <div className="flex justify-center">
        <Button type="button" onClick={onRetry} variant="outline">
          <Icon name="history" className="size-4" />
          {t("retry")}
        </Button>
      </div>
    </section>
  );
}
