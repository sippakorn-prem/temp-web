/**
 * Phone numbers, normalized for Clerk.
 *
 * Clerk only accepts E.164 (`+66812345678`), but nobody in Thailand writes their number
 * that way — they write `081-234-5678`. `PhoneInput` handles that on the forms: it takes
 * the local format and hands back E.164. This module holds what the forms can't: which
 * countries we offer, and the conversion for a number typed somewhere without a country
 * selector (the sign-in identifier, which may equally be an email address).
 */

import { isValidPhoneNumber, parsePhoneNumberFromString } from "@/lib/ds-utils";

/** ISO code of the country the phone inputs start on. */
export const DEFAULT_PHONE_COUNTRY = "TH";

/**
 * Countries offered by the phone inputs.
 *
 * Thailand is the product; the United States is here only so Clerk's test numbers
 * (`+1 201 555 01xx`) can be used while developing, and it is dropped from production
 * builds. Offering a country we can't text is worse than not offering it — Clerk sends
 * SMS only to countries on the instance's allowlist, and any endpoint that will text an
 * arbitrary international number is somebody's SMS-pumping revenue. Add a country here
 * and to the Clerk allowlist together, or codes silently never arrive.
 *
 * Names are translated copy, in `messages/*.json` under `phoneCountries`.
 */
export const PHONE_COUNTRIES: readonly ("TH" | "US")[] =
  process.env.NODE_ENV === "production" ? ["TH"] : ["TH", "US"];

/**
 * The E.164 form of a number typed without a country selector, or `null` when it isn't a
 * phone number at all. Assumes Thailand, so `081-234-5678` works; an international number
 * written with its own `+` is parsed as given.
 */
export function toE164(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), DEFAULT_PHONE_COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * The phone gate the forms use. Strict `isValidPhoneNumber`, plus one dev-only exception:
 * Clerk's development instances issue fictional US test numbers (`+1 XXX 555-01xx`, code
 * 424242) that never pass libphonenumber, so accept those outside production to exercise
 * Clerk's OTP flows. Production stays strict and doesn't even offer the US country
 * (see {@link PHONE_COUNTRIES}), so the exception is unreachable there.
 */
export function isUsablePhoneNumber(value: string): boolean {
  if (isValidPhoneNumber(value)) return true;
  if (process.env.NODE_ENV === "production") return false;
  const parsed = parsePhoneNumberFromString(value);
  return Boolean(parsed && /^\+1\d{3}55501\d{2}$/.test(parsed.number));
}
