"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { Switch } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { card, note } from "@/lib/ui";

const LOCALES = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
] as const;

/** The three switches a user actually controls. Security alerts are not among them. */
const TOGGLES = ["dealUpdates", "weeklyDigest", "product"] as const;
type Toggle = (typeof TOGGLES)[number];

type Notifications = Partial<Record<Toggle, boolean>>;

/** Deal updates are on unless the user says otherwise — they're the reason for the account. */
const DEFAULTS: Record<Toggle, boolean> = {
  dealUpdates: true,
  weeklyDigest: false,
  product: false,
};

/**
 * Language and email notifications.
 *
 * Preferences are written to Clerk `unsafeMetadata`, the same durable store the PDPA consent
 * record uses — so the choice survives now and the mailer can read it when there is one.
 * TODO(backend): move to our own store once the notifications endpoint exists; metadata is
 * user-writable and shouldn't be the long-term source of truth for what we send.
 */
export function PreferencesSection() {
  const t = useTranslations("settings.preferences");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();

  const stored = (user?.unsafeMetadata?.notifications ?? {}) as Notifications;
  const [pending, setPending] = React.useState<Notifications>({});

  const value = (key: Toggle) => pending[key] ?? stored[key] ?? DEFAULTS[key];

  async function toggle(key: Toggle, next: boolean) {
    setPending((prev) => ({ ...prev, [key]: next }));
    try {
      // Deep-merge semantics: only the `notifications` branch is touched, so the PDPA
      // consent record living beside it in the same metadata blob is left alone.
      await user?.updateMetadata({
        unsafeMetadata: { notifications: { ...stored, [key]: next } },
      });
    } catch {
      // Put the switch back where it was rather than leaving it lying about the state.
      setPending((prev) => ({ ...prev, [key]: !next }));
    }
  }

  function setLocale(next: string) {
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <>
      <div className={cn(card, "mb-4")}>
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <div className="text-sm font-semibold">{t("language")}</div>
            <div className={cn(note, "mt-0.5 text-[12.5px]")}>{t("languageHint")}</div>
          </div>
          <div
            role="group"
            aria-label={t("language")}
            className="flex shrink-0 gap-1 rounded-lg bg-muted p-1"
          >
            {LOCALES.map(({ value: id, label }) => {
              const selected = locale === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => !selected && setLocale(id)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-md px-3 text-sm font-semibold text-muted-foreground",
                    selected && "bg-card text-foreground shadow-sm"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="mb-0.5 text-sm font-bold">{t("emailTitle")}</div>
        {TOGGLES.map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-3.5 border-t border-border py-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t(`${key}.label`)}</div>
              <div className={cn(note, "mt-0.5 text-xs")}>{t(`${key}.hint`)}</div>
            </div>
            <Switch
              checked={value(key)}
              onCheckedChange={(next) => void toggle(key, next)}
              className="shrink-0"
            />
          </label>
        ))}

        {/* Not a preference. Someone signing in from a new device is told, full stop —
            offering to turn that off would be offering to hide a break-in. */}
        <label className="flex items-center gap-3.5 border-t border-border py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{t("security.label")}</div>
            <div className={cn(note, "mt-0.5 text-xs")}>{t("security.hint")}</div>
          </div>
          <Switch checked disabled className="shrink-0" />
        </label>
      </div>
    </>
  );
}
