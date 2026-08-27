"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Landing page for Omise's 3DS / PromptPay redirect. Omise sends the buyer here with no
 * deal context (the return URI is opaque by design), so we recover the deal code we stashed
 * before the redirect and send them back to the deal, which refetches authoritative state.
 * The charge is confirmed server-side by webhook/reconciler, not here.
 */
const PAY_RETURN_KEY = "safedeal:pay:return";

export default function PayReturnPage() {
  const router = useRouter();
  const t = useTranslations("payReturn");

  React.useEffect(() => {
    const code = sessionStorage.getItem(PAY_RETURN_KEY);
    sessionStorage.removeItem(PAY_RETURN_KEY);
    const target = code ? `/deals/${encodeURIComponent(code)}` : "/deals";
    const id = window.setTimeout(() => router.replace(target), 500);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <main className="mx-auto grid min-h-[60vh] w-[min(520px,calc(100%-32px))] place-items-center py-16 text-center">
      <div>
        <div
          aria-hidden
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
        />
        <h1 className="text-lg font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>
      </div>
    </main>
  );
}
