"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ds-utils";
import { LOCALES, localeFromPath } from "@/i18n/config";

const LABELS: Record<(typeof LOCALES)[number], string> = { th: "ไทย", en: "EN" };
// Thai-first, matching the design (the product's home market leads).
const ORDER = ["th", "en"] as const;

/**
 * Language pill for the marketing landing. Navigates between the `/en` and `/th` URLs so each
 * language is a distinct, indexable page, and writes the `locale` cookie so the rest of the app
 * (which is cookie-based) stays on the chosen language.
 *
 * Soft `Link` navigation (no full reload): the marketing sections are server components and
 * re-render on the client transition, and the hero illustration receives its copy as props —
 * so nothing here depends on the root layout's messages provider (which a soft nav does not
 * refresh). The one thing the shared root layout owns and can't update on a soft nav is
 * `<html lang>`, so we sync it from the path locale for assistive tech.
 */
export function LanguageToggle({ label, className }: { label: string; className?: string }) {
  const pathname = usePathname();
  const active = localeFromPath(pathname) ?? "th";

  React.useEffect(() => {
    document.documentElement.lang = active;
  }, [active]);

  // Swap the leading `/en` or `/th` segment; fall back to `/<locale>` for anything else.
  const hrefFor = (locale: string) => {
    const rest = pathname.replace(/^\/(en|th)(?=\/|$)/, "");
    return `/${locale}${rest || ""}`;
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex rounded-full border border-border bg-card p-[3px]", className)}
    >
      {ORDER.map((locale) => {
        const selected = active === locale;
        return (
          <Link
            key={locale}
            href={hrefFor(locale)}
            aria-current={selected ? "true" : undefined}
            onClick={() => {
              document.cookie = `locale=${locale};path=/;max-age=31536000;samesite=lax`;
            }}
            className={cn(
              "min-h-[30px] rounded-full px-[14px] text-[13px] font-bold leading-[30px] no-underline transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {LABELS[locale]}
          </Link>
        );
      })}
    </div>
  );
}
