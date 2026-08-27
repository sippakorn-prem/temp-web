"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ds";
import { Icon } from "@/components/icon";

export interface SetupStep {
  id: "email" | "phone" | "payout";
  done: boolean;
  href: string;
}

/** A concise dashboard reminder; the settings workflow itself stays on its dedicated pages. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const t = useTranslations("dashboard.setup");
  const remaining = steps.filter((step) => !step.done);
  const next = remaining[0];

  if (!next) return null;

  return (
    <Alert variant="warning" aria-label={t("label")}>
      <Icon name="alert" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{t("body", { count: remaining.length })}</p>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={next.href}>{t("complete")}</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
