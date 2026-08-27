// Locale constants shared by the request config, the marketing landing routes, and the
// bare-root redirect. Kept framework-free so it can be imported from anywhere on the server.
export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

// Thai market: Thai is the default the bare root `/` redirects to when nothing else is known.
export const DEFAULT_LOCALE: Locale = "th";

// App-level default when there is no `/en`|`/th` prefix and no cookie — the signed-in app
// stays English-first, unchanged from before path routing existed.
export const APP_DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "th";
}

/** The locale carried by a `/en` or `/th` URL prefix, or null for any other path. */
export function localeFromPath(pathname: string | undefined | null): Locale | null {
  if (!pathname) return null;
  const first = pathname.split("/", 2)[1];
  return isLocale(first) ? first : null;
}
