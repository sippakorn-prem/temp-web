"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  FormField,
  PhoneInput,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { StepRail } from "@/components/deal/step-rail";
import { usePhoneCountryLabels } from "@/hooks/use-phone-countries";
import { joinDeal } from "@/lib/api/deals";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/ds-utils";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, isUsablePhoneNumber } from "@/lib/phone";
import type { Deal } from "@/lib/domain/deal";
import { formatBaht, formatFeePercent } from "@/lib/money";
import { card, code as codeClass, money, note } from "@/lib/ui";

/**
 * The invited buyer's review-and-accept surface, shown inside the deal room before they
 * are a participant (status `waiting_buyer_accept`). Accepting *is* joining: the backend
 * records consent and the encrypted delivery destination in one authoritative call, so
 * this is the only place a buyer supplies those. On success we invalidate the deal query
 * and the room re-renders as the full participant view.
 *
 * The code is already resolved on the join screen, so this is the old four-step flow minus
 * the lookup: review → protection → delivery → accept, beside a persistent price rail.
 */
export function DealAccept({ deal, feeBPS }: { deal: Deal; feeBPS: number }) {
  const t = useTranslations("dealFlow.join");
  const common = useTranslations("common");
  const phoneLabels = usePhoneCountryLabels();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [step, setStep] = React.useState(0);
  const [receiverName, setReceiverName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [phoneEdited, setPhoneEdited] = React.useState(false);
  const [address, setAddress] = React.useState("");

  // Default the delivery phone to the buyer's own number (editable — a gift may ship
  // elsewhere). Only prefill until they touch the field, and only once Clerk has loaded it.
  const buyerPhone =
    user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? "";
  React.useEffect(() => {
    if (!phoneEdited && buyerPhone) setPhone(buyerPhone);
  }, [buyerPhone, phoneEdited]);
  const [accepted, setAccepted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const detailsComplete =
    receiverName.trim().length > 0 && isUsablePhoneNumber(phone) && address.trim().length >= 5;

  async function accept() {
    if (busy) return;
    if (!accepted || !detailsComplete) {
      setError(t("acceptError"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await joinDeal(deal.code, {
        accepted: true,
        expectedRevision: deal.revision ?? 1,
        destination: { receiverName: receiverName.trim(), phone: phone.trim(), address: address.trim() },
      });
      toast.success(t("joinedToast"));
      // The buyer is now a participant — drop the invitation and refetch the deal so this
      // component unmounts in favour of the full deal room.
      await queryClient.invalidateQueries({ queryKey: ["invitation", deal.code] });
      await queryClient.invalidateQueries({ queryKey: ["deal", deal.code] });
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? t("changedError") : t("submitError"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-[min(1040px,calc(100%-40px))] pt-8 pb-16">
      <header className="mb-6">
        <p className="text-[13px] font-bold text-primary">{t("privateBadge")}</p>
        <h1 className="mt-1 text-[clamp(26px,5vw,32px)] font-bold tracking-[-0.03em]">{t("title")}</h1>
        <p className={cn(note, "mt-1 max-w-[560px] text-[15px]")}>{t("subtitle")}</p>
      </header>

      <StepRail
        step={step}
        labels={[t("steps.review"), t("steps.protection"), t("steps.delivery"), t("steps.accept")]}
        progressLabel={t("progressLabel")}
        onStepChange={(next) => { setError(""); setStep(next); }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
        <Card className="gap-0 py-0">
          <CardContent className="p-[clamp(20px,5vw,34px)]">
          {step === 0 && (
            <div className="grid gap-5">
              <Heading title={t("reviewTitle")} body={t("reviewBody")} />
              <DealReview deal={deal} />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <Heading title={t("protectionTitle")} body={t("protectionBody", { percent: formatFeePercent(feeBPS) })} />
              <Alert variant="info">
                <AlertTitle>{t("heldTitle")}</AlertTitle>
                <AlertDescription>{t("heldBody")}</AlertDescription>
              </Alert>
              <Alert variant="info">
                <AlertTitle>{t("inspectTitle")}</AlertTitle>
                <AlertDescription>{t("inspectBody", { days: deal.inspectionPeriodDays ?? 3 })}</AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertTitle>{t("releaseTitle")}</AlertTitle>
                <AlertDescription>{t("releaseBody")}</AlertDescription>
              </Alert>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <Heading title={t("deliveryTitle")} body={t("deliveryBody")} />
              <FormField label={t("receiverLabel")} required value={receiverName} onChange={(event) => setReceiverName(event.target.value)} />
              <PhoneInput
                label={t("phoneLabel")}
                labels={phoneLabels}
                countries={PHONE_COUNTRIES}
                defaultCountry={DEFAULT_PHONE_COUNTRY}
                countryLabel={common("countryCode")}
                searchPlaceholder={common("searchCountries")}
                emptyText={common("noCountries")}
                autoComplete="tel"
                placeholder="081-234-5678"
                value={phone}
                onChange={(value) => { setPhoneEdited(true); setPhone(value); }}
              />
              <FormField textarea rows={4} label={t("addressLabel")} required value={address} onChange={(event) => setAddress(event.target.value)} />
              <p className={cn(note, "text-xs")}>{t("privacyNote")}</p>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <Heading title={t("acceptTitle")} body={t("acceptBody")} />
              <DealReview deal={deal} />
              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-ring",
                accepted && "border-primary bg-accent",
                !accepted && error && "border-error-border bg-error-bg/50",
              )}>
                <input
                  type="checkbox"
                  className="mt-0.5 size-[18px] shrink-0 accent-primary"
                  checked={accepted}
                  onChange={(event) => { setAccepted(event.target.checked); setError(""); }}
                />
                <span className="grid gap-1">
                  <strong>{t("checkboxTitle")}</strong>
                  <span className="text-sm text-muted-foreground">{t("checkboxBody")}</span>
                </span>
              </label>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <Button variant="outline" disabled>{t("changeSoon")}</Button>
            </div>
          )}

          <div className="mt-6 flex justify-between border-t pt-5">
            <Button variant="ghost" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((value) => value - 1); }}>
              {common("back")}
            </Button>
            {step < 3 ? (
              <Button disabled={step === 2 && !detailsComplete} onClick={() => { setError(""); setStep((value) => value + 1); }}>
                {common("continue")}
              </Button>
            ) : (
              <Button loading={busy} disabled={!accepted} onClick={() => void accept()}>
                {t("acceptCta")}
              </Button>
            )}
          </div>
          </CardContent>
        </Card>
        </div>

        <ProtectionAside deal={deal} feeBPS={feeBPS} />
      </div>
    </main>
  );
}

/** Persistent trust rail: the price up top, then why the money is safe. */
function ProtectionAside({ deal, feeBPS }: { deal: Deal; feeBPS: number }) {
  const t = useTranslations("dealFlow.join");
  const tAside = useTranslations("dealFlow.join.aside");
  const points = [
    { icon: "protection", title: tAside("escrowTitle"), body: tAside("escrowBody") },
    { icon: "clock", title: tAside("inspectTitle"), body: tAside("inspectBody") },
    { icon: "support", title: tAside("disputeTitle"), body: tAside("disputeBody") },
  ] as const;
  return (
    <aside className={cn(card, "p-5 lg:sticky lg:top-6")}>
      <Badge variant="warning">{t("privateBadge")}</Badge>
      <div className="mt-4 flex items-baseline justify-between gap-3 border-b pb-4">
        <span className={note}>{t("itemValue")}</span>
        <span className={cn(money, "text-[22px]")}>{formatBaht(deal.amountSatang)}</span>
      </div>
      <h2 className="mt-4 text-sm font-bold">{tAside("title")}</h2>
      <ul className="mt-4 grid gap-4">
        {points.map((point) => (
          <li key={point.title} className="flex gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon name={point.icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{point.title}</p>
              <p className={cn(note, "mt-0.5")}>{point.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className={cn(note, "mt-4 border-t pt-4 text-xs")}>{tAside("feeNote", { percent: formatFeePercent(feeBPS) })}</p>
    </aside>
  );
}

function DealReview({ deal }: { deal: Deal }) {
  const t = useTranslations("dealFlow.join");
  return (
    <div className="rounded-xl border bg-card p-[22px]">
      <div className="flex items-start justify-between gap-4">
        <Badge variant="warning">{t("privateBadge")}</Badge>
        <span className={cn(codeClass, "tracking-[0.06em]")}>{deal.code}</span>
      </div>
      <h2 className="mt-3.5 text-[22px] font-bold tracking-[-0.02em]">{deal.title}</h2>
      {deal.description ? <p className={cn(note, "mt-1")}>{deal.description}</p> : null}
      <div className="mt-4 flex items-baseline justify-between gap-4 border-y py-3.5">
        <span className={note}>{t("itemValue")}</span>
        <span className={cn(money, "text-[22px]")}>{formatBaht(deal.amountSatang)}</span>
      </div>
      <ReviewRow label={t("agreement")} divider={false}>
        <div className="max-h-[220px] overflow-auto pr-1.5 leading-[1.85]">{deal.terms.agreement}</div>
      </ReviewRow>
      <ReviewRow label={t("seller")} mono>{deal.counterparty.name}</ReviewRow>
      <ReviewRow label={t("shipping")} mono>{deal.preferredCarrier ?? "—"}</ReviewRow>
    </div>
  );
}

function ReviewRow({
  label,
  mono = false,
  divider = true,
  children,
}: {
  label: string;
  mono?: boolean;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-[128px_minmax(0,1fr)] gap-5 py-4 max-sm:grid-cols-1 max-sm:gap-1.5", divider && "border-t")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className={cn("min-w-0", mono && "font-mono text-sm")}>{children}</div>
    </div>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className={cn(note, "mt-1")}>{body}</p>
    </div>
  );
}
