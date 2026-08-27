"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { Icon, type IconName } from "@/components/icon";
import { code, note } from "@/lib/ui";

const STEPS: { icon: IconName }[] = [{ icon: "deals" }, { icon: "protection" }, { icon: "complete" }];

/**
 * What a brand-new account sees instead of an empty list.
 *
 * An empty state that only says "no deals yet" wastes the one moment the user is most
 * willing to read: they have just signed up and don't yet know what escrow means for them.
 * So this explains the three-step shape of a deal first, and only then offers the two ways
 * in — because "create" and "join" mean nothing until you know which end you're on.
 */
export function WelcomeCard({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations("dashboard.welcome");
  const tDash = useTranslations("dashboard");

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="grid justify-items-center gap-2 px-7.5 pt-8.5 pb-6.5 text-center">
        <span className="grid size-13.5 place-items-center rounded-full bg-accent text-primary">
          <Icon name="protection" className="size-6.5" />
        </span>
        <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">{t("title")}</h2>
        <p className={cn(note, "max-w-[52ch]")}>{t("body")}</p>
      </div>

      <div className="grid border-t border-border md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="grid gap-2 border-b border-border p-6 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
          >
            <span className={cn(code, "text-primary")}>{t("step", { n: i + 1 })}</span>
            <Icon name={step.icon} className="size-5.5 text-foreground" />
            <strong className="text-[15px]">{t(`s${i + 1}Title`)}</strong>
            <span className={cn(note, "text-[13px]")}>{t(`s${i + 1}Body`)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2.5 border-t border-border p-5.5">
        {canCreate ? (
          <Button asChild>
            <Link href="/deals/new">
              <Icon name="plus" className="size-4" />
              {t("createFirst")}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/deals/join">{tDash("joinByCode")}</Link>
        </Button>
      </div>
    </section>
  );
}
