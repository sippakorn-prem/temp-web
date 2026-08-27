"use client";

import * as React from "react";
import Link from "next/link";
import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge, Button, EscrowTimeline, MoneyFee } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { feeBreakdown, formatBaht, formatFeePercent } from "@/lib/money";
import { card, code as codeStyle, note } from "@/lib/ui";

export function DealShareCard({
  code,
  amountSatang,
  feeBPS,
}: {
  code: string;
  amountSatang: number;
  feeBPS: number;
}) {
  const t = useTranslations("dealFlow.create");
  const pricing = feeBreakdown(amountSatang, feeBPS);
  const invitationPath = `/deals/join?code=${encodeURIComponent(code)}`;
  const [invitationLink, setInvitationLink] = React.useState(invitationPath);
  const [copied, setCopied] = React.useState<"code" | "link" | null>(null);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setInvitationLink(`${window.location.origin}${invitationPath}`);
  }, [invitationPath]);

  React.useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  async function copyValue(value: string, target: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(null), 1800);
      toast.success(target === "code" ? t("copiedCode") : t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <div className={cn(card, "mx-auto mt-8 max-w-[520px] p-[clamp(22px,5vw,28px)]")}>
      <Badge variant="warning">{t("waitingBadge")}</Badge>
      <h1 className="mt-3.5 text-[26px] font-bold tracking-tight">{t("shareTitle")}</h1>
      <p className={cn(note, "mt-1.5")}>{t("shareBody")}</p>
      <div className="mt-[18px] overflow-hidden rounded-xl border border-info-border bg-info-bg shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3.5 p-5">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-info">{t("privateCode")}</p>
            <span className={cn(codeStyle, "break-all text-2xl font-bold tracking-[0.12em] text-foreground sm:text-[30px]")}>{code}</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 bg-card" onClick={() => void copyValue(code, "code")}>
            <CopyIcon />{copied === "code" ? t("copiedShort") : t("copyCode")}
          </Button>
        </div>
        <div className="flex items-center gap-2.5 border-t border-info-border bg-card py-3 pl-5 pr-4">
          <span className="min-w-0 flex-1 break-all text-sm text-muted-foreground">{invitationLink}</span>
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label={t("copyLink")} onClick={() => void copyValue(invitationLink, "link")}>
            <CopyIcon />
          </Button>
        </div>
      </div>
      <MoneyFee
        className="mt-[18px]"
        rows={[
          { id: "amount", label: t("buyerPays"), value: formatBaht(amountSatang) },
          {
            id: "fee",
            label: t("sellerFee", { percent: formatFeePercent(feeBPS) }),
            value: formatBaht(pricing.feeSatang),
          },
        ]}
        total={{
          id: "net",
          label: t("youReceive"),
          value: formatBaht(pricing.netSatang),
        }}
      />
      <div className="mt-5.5">
        <h2 className="mb-3 text-sm font-bold">{t("whatNext")}</h2>
        <EscrowTimeline
          label={t("nextTimelineLabel")}
          steps={[
            { id: "created", title: t("nextCreated"), state: "done" },
            { id: "buyer", title: t("nextBuyer"), detail: t("nextBuyerBody"), tag: t("now"), state: "current" },
            { id: "funded", title: t("nextFunded"), state: "upcoming" },
            { id: "ship", title: t("nextShip"), state: "upcoming" },
            { id: "delivery", title: t("nextDelivery"), state: "upcoming" },
            { id: "payout", title: t("nextPayout"), state: "upcoming" },
          ]}
        />
      </div>
      <div className="mt-1 flex flex-wrap gap-3 border-t pt-[18px]">
        <Button type="button" onClick={() => void copyValue(invitationLink, "link")}>
          <CopyIcon />{copied === "link" ? t("copiedShort") : t("copyLink")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/deals">{t("backToDeals")}</Link>
        </Button>
      </div>
    </div>
  );
}
