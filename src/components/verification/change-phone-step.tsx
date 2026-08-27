"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "lucide-react";
import { Button, PhoneInput } from "@/components/ds";
import { usePhoneCountryLabels } from "@/hooks/use-phone-countries";
import { cn } from "@/lib/ds-utils";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, isUsablePhoneNumber } from "@/lib/phone";
import { card, note } from "@/lib/ui";

/**
 * Correcting the number.
 *
 * Thai numbers are written `081-234-5678` and stored `+66812345678`; asking people to
 * translate that themselves is how a valid number gets rejected for its punctuation. So
 * the field takes the local form and the E.164 that will actually be saved is shown live
 * underneath — no surprises about what we're about to text.
 */
export function ChangePhoneStep({
  adding = false,
  error,
  pending,
  onSubmit,
  onBack,
}: {
  /** No number on the account yet — the same form, but it isn't a correction. */
  adding?: boolean;
  error?: string;
  pending: boolean;
  onSubmit: (e164: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations("verify.changePhone");
  const tCommon = useTranslations("common");
  // PhoneInput hands back E.164 directly, so the value is already what gets saved.
  const [e164, setE164] = React.useState("");
  const labels = usePhoneCountryLabels();
  const valid = Boolean(e164) && isUsablePhoneNumber(e164);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3" onClick={onBack}>
        <ChevronLeftIcon className="size-[15px]" />
        {t("back")}
      </Button>

      <section className={card}>
        <h2 className="text-lg font-bold">{t(adding ? "addTitle" : "title")}</h2>
        <p className={cn(note, "mt-1.5 text-[13.5px]")}>{t(adding ? "addBody" : "body")}</p>

        <PhoneInput
          label={t("label")}
          hint={t("hint")}
          error={error}
          labels={labels}
          countries={PHONE_COUNTRIES}
          defaultCountry={DEFAULT_PHONE_COUNTRY}
          countryLabel={tCommon("countryCode")}
          searchPlaceholder={tCommon("searchCountries")}
          emptyText={tCommon("noCountries")}
          autoComplete="tel"
          placeholder="081-234-5678"
          value={e164}
          onChange={setE164}
          className="mt-4 max-w-90"
        />

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
          <span className={cn(note, "text-[12.5px]")}>{t("savedAs")}</span>
          <span className="font-mono font-bold">{e164 || "—"}</span>
        </div>

        <div className="mt-4 flex gap-2.5">
          <Button
            loading={pending}
            disabled={!valid}
            onClick={() => valid && onSubmit(e164)}
          >
            {t("send")}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={onBack}>
            {tCommon("cancel")}
          </Button>
        </div>
      </section>
    </>
  );
}
