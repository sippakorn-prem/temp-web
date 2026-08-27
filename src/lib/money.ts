// Money is integer satang everywhere — never a float, never baht in arithmetic
// (CLAUDE.md golden rule 1). These helpers are the only place satang becomes a string.

/** 1 baht = 100 satang. */
export const SATANG_PER_BAHT = 100;

/** SafeDeal's platform fee, charged to the seller. Basis points so the math stays integer. */
export const PLATFORM_FEE_BPS = 300; // 3.00%

/**
 * Seller-side fee for a gross amount, in satang. Rounds half-up to the satang, so
 * `fee + net === gross` holds exactly for every input.
 */
export function platformFeeSatang(grossSatang: number, feeBPS = PLATFORM_FEE_BPS): number {
  return Math.round((grossSatang * feeBPS) / 10_000);
}

/** What the seller receives after the platform fee, in satang. */
export function netToSellerSatang(grossSatang: number, feeBPS = PLATFORM_FEE_BPS): number {
  return grossSatang - platformFeeSatang(grossSatang, feeBPS);
}

export interface FeeBreakdown {
  grossSatang: number;
  feeSatang: number;
  netSatang: number;
}

/** Calculate one internally consistent seller-fee breakdown from an explicit policy. */
export function feeBreakdown(grossSatang: number, feeBPS: number): FeeBreakdown {
  const feeSatang = platformFeeSatang(grossSatang, feeBPS);
  return { grossSatang, feeSatang, netSatang: grossSatang - feeSatang };
}

/** Render integer basis points as a percentage without floating-point rounding. */
export function formatFeePercent(feeBPS: number): string {
  const whole = Math.trunc(feeBPS / 100);
  const fraction = Math.abs(feeBPS % 100);
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}%`;
}

/**
 * Render satang as Thai Baht, e.g. 1_850_000 → "฿18,500". Whole baht amounts drop the
 * decimals (the prototype's house style); anything with satang keeps both digits.
 */
export function formatBaht(satang: number, locale = "en-US"): string {
  const hasSubunit = satang % SATANG_PER_BAHT !== 0;
  return `฿${(satang / SATANG_PER_BAHT).toLocaleString(locale, {
    minimumFractionDigits: hasSubunit ? 2 : 0,
    maximumFractionDigits: hasSubunit ? 2 : 0,
  })}`;
}

/** Convenience for fixtures and form input, which are authored in whole baht. */
export function bahtToSatang(baht: number): number {
  return Math.round(baht * SATANG_PER_BAHT);
}

/** Parse a human-entered baht string without ever converting it through a float. */
export function parseBahtToSatang(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [baht, fraction = ""] = normalized.split(".");
  const whole = Number(baht);
  if (!Number.isSafeInteger(whole) || whole > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return null;
  return whole * 100 + Number(fraction.padEnd(2, "0"));
}
