import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { APP_DEFAULT_LOCALE, type Locale, isLocale, localeFromPath } from "./config";

// Bilingual TH/EN. Locale resolution order:
//   1. URL prefix `/en` or `/th` — the public marketing landing, which needs per-locale URLs
//      for SEO. `src/proxy.ts` forwards the path in the `x-pathname` header (there is no
//      next-intl routing middleware).
//   2. `locale` cookie — the signed-in app, switched from the account menu.
//   3. English default.
// This keeps the app's non-prefixed routes cookie-based while giving the landing real
// `/en` / `/th` URLs and matching `<html lang>`.
export default getRequestConfig(async () => {
  const pathLocale = localeFromPath((await headers()).get("x-pathname"));
  const cookieLocale = (await cookies()).get("locale")?.value;

  const locale: Locale = pathLocale ?? (isLocale(cookieLocale) ? cookieLocale : APP_DEFAULT_LOCALE);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
