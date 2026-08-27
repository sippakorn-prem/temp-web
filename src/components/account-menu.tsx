"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/ds-utils";

const LOCALES = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
] as const;

/**
 * The account menu, opened from the sidebar footer on desktop and from the top-bar avatar
 * on mobile. Same menu both times — the trigger and the side it flies out on are the only
 * difference, so callers pass those in.
 *
 * The language control lives *inside* the menu rather than as a separate header button:
 * it's a setting, changed rarely, and giving it its own permanent slot in the chrome buys
 * nothing on a screen where every other pixel is about the deal.
 */
export function AccountMenu({
  children,
  side = "top",
  align = "start",
  unverified = false,
}: {
  /** The trigger element — rendered as-is via `asChild`. */
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  /** Flags the verification entry when email or phone is still unconfirmed. */
  unverified?: boolean;
}) {
  const t = useTranslations("chrome");
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={10}
        className="w-[264px] rounded-xl p-1.5"
        aria-label={t("accountMenu")}
      >
        <MenuLink href="/account" icon="settings" label={t("accountSettings")} />
        <MenuLink
          href="/verify"
          icon="protection"
          label={t("verificationCentre")}
          badge={unverified ? "!" : undefined}
          badgeLabel={t("actionRequired")}
        />
        <MenuLink href="/onboarding/payout" icon="payment" label={t("payoutAccount")} />

        <LanguageSwitch />

        {/* The design also carries a "Help" entry. Left out until there's somewhere for it
            to go — a menu row that navigates nowhere is worse than one that isn't there. */}
        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="min-h-[38px] gap-[9px] rounded-md px-[9px]"
          onSelect={() => void signOut({ redirectUrl: "/" })}
        >
          <Icon name="refund" className="size-[17px]" />
          <span>{t("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLink({
  href,
  icon,
  label,
  badge,
  badgeLabel,
}: {
  href: string;
  icon: "settings" | "protection" | "payment";
  label: string;
  badge?: string;
  badgeLabel?: string;
}) {
  return (
    <DropdownMenuItem asChild className="min-h-[38px] gap-[9px] rounded-md px-[9px]">
      <Link href={href} className="no-underline">
        <Icon name={icon} className="size-[17px]" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge ? (
          <Badge
            variant="warning"
            aria-label={badgeLabel}
            className="ml-auto px-[7px] py-[2px] text-[11px] font-semibold"
          >
            {badge}
          </Badge>
        ) : null}
      </Link>
    </DropdownMenuItem>
  );
}

/**
 * Thai / English as a segmented control.
 *
 * The locale is a cookie read by `src/i18n/request.ts` on the server, so switching means
 * writing it and re-rendering the server tree — `router.refresh()` rather than a reload,
 * which would throw away scroll position and any in-flight query cache. The two options
 * are real menu items (radix owns arrow-key focus between them); `preventDefault` on
 * select keeps the menu open so the change is visible where it was made.
 */
function LanguageSwitch() {
  const t = useTranslations("chrome");
  const locale = useLocale();
  const router = useRouter();

  function select(next: string) {
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <div className="px-2 pt-2 pb-1">
      <DropdownMenuLabel className="px-0.5 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {t("language")}
      </DropdownMenuLabel>
      <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label={t("language")}>
        {LOCALES.map(({ value, label }) => {
          const selected = locale === value;
          return (
            <DropdownMenuItem
              key={value}
              role="menuitemradio"
              aria-checked={selected}
              onSelect={(event) => {
                event.preventDefault();
                if (!selected) select(value);
              }}
              className={cn(
                "min-h-9 flex-1 justify-center rounded-md px-3 text-sm font-semibold text-muted-foreground",
                selected && "bg-card text-foreground shadow-sm"
              )}
            >
              {label}
            </DropdownMenuItem>
          );
        })}
      </div>
    </div>
  );
}
