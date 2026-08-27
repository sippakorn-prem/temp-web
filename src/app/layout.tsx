import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ds";
import "./globals.css";

// Absolute base for canonical + hreflang + OG URLs. Set NEXT_PUBLIC_SITE_URL in prod.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SafeDeal",
  description: "Peer-to-peer escrow for Thailand.",
  openGraph: { siteName: "SafeDeal", type: "website" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang={locale} suppressHydrationWarning>
        {/* Extensions (Grammarly, etc.) inject attributes onto <body> before hydration;
            suppress the resulting one-level attribute mismatch, as on <html>. */}
        <body className="min-h-dvh bg-background text-foreground antialiased" suppressHydrationWarning>
          <NextIntlClientProvider>
            <Providers>{children}</Providers>
            <Toaster richColors />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
