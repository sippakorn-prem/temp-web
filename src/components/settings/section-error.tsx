"use client";

import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@/components/ds";
import { Icon, icons } from "@/components/icon";

/**
 * One section failed to load; the rest of the page is fine.
 *
 * Scoped to the panel on purpose — replacing the whole settings page because the session
 * list timed out would strand a user who came here to change something else entirely.
 */
export function SectionError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("settings");

  return (
    <EmptyState
      icon={icons.alert}
      tone="error"
      title={t("sectionErrorTitle")}
      className="min-h-50"
      action={
        <Button
          type="button"
          onClick={onRetry}
          variant="outline"
        >
          <Icon name="history" className="size-4" />
          {t("retry")}
        </Button>
      }
    >
      {t("sectionErrorBody")}
    </EmptyState>
  );
}
