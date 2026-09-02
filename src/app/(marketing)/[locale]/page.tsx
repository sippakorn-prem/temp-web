import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LOCALES, isLocale } from "@/i18n/config";
import { LandingHeader } from "@/components/marketing/landing-header";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { HappySection } from "@/components/marketing/happy-section";
import { FlowSection } from "@/components/marketing/flow-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { RealAppSection } from "@/components/marketing/real-app-section";
import { PaymentLogos } from "@/components/marketing/payment-logos";
import { FinalCta } from "@/components/marketing/final-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

// `/en` and `/th` are the public, indexable marketing landing. The route lives in the
// (marketing) group so the URL stays `/{locale}`; the locale drives `<html lang>` (via the
// path-aware resolver in src/i18n/request.ts) and the hreflang alternates below.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "landing.meta" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: { canonical: `/${locale}`, languages: { en: "/en", th: "/th", "x-default": "/th" } },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: "SafeDeal",
      title,
      description,
      locale: locale === "th" ? "th_TH" : "en_US",
      alternateLocale: locale === "th" ? "en_US" : "th_TH",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="sd-landing min-h-full">
      <LandingHeader />
      <Hero />
      <ProblemSection />
      <HappySection />
      <FlowSection />
      <TrustSection />
      <RealAppSection />
      <PaymentLogos />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
