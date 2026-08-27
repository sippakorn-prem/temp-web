import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/i18n/config";

// The bare root has no language of its own; send it to a locale-prefixed landing so every
// public URL is `/en` or `/th` (indexable per language). Prefer the visitor's cookie, then
// their Accept-Language, then Thai (the product's home market).
export default async function RootRedirect() {
  const cookieLocale = (await cookies()).get("locale")?.value;
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : preferredLocale((await headers()).get("accept-language"));

  redirect(`/${locale}`);
}

function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Walk the ordered language list and take the first that maps to a locale we serve.
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("th")) return "th";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}
