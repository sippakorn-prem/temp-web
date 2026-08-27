"use client";

import { useTranslations } from "next-intl";
import { PHONE_COUNTRIES } from "@/lib/phone";

/**
 * Country names for `PhoneInput`, keyed by ISO code, in the active language.
 *
 * `react-phone-number-input` ships locale maps of its own, but we offer two countries —
 * importing 250 translated names to use two of them would be silly, and it would put the
 * copy somewhere next-intl can't see. The names live in `messages/*.json` like every other
 * string.
 */
export function usePhoneCountryLabels(): Record<string, string> {
  const t = useTranslations("phoneCountries");

  return Object.fromEntries(PHONE_COUNTRIES.map((country) => [country, t(country)]));
}
