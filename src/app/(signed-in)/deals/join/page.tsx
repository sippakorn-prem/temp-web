"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/app-layout";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from "@/components/ds";
import { usePayout } from "@/hooks/use-payout";
import { getInvitation } from "@/lib/api/deals";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/ds-utils";
import { isDealCode } from "@/lib/domain/deal";
import { note } from "@/lib/ui";

export default function JoinDealPage() {
  return (
    <React.Suspense>
      <JoinDealFlow />
    </React.Suspense>
  );
}

/**
 * The join flow's front door: enter a code, find the deal, land on its deal room.
 * Review, delivery and acceptance happen there — this screen only resolves the code.
 * The backend remains authoritative for the lookup; a well-formed code is not proof a
 * deal exists, so success is decided by the invitation response, not the input.
 */
function JoinDealFlow() {
  const t = useTranslations("dealFlow.join");
  const router = useRouter();
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const sharedCode = search.get("code")?.trim().toUpperCase() ?? "";
  const payout = usePayout();

  const [code, setCode] = React.useState(sharedCode);
  const [focused, setFocused] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (sharedCode) setCode(sharedCode);
  }, [sharedCode]);

  const valid = isDealCode(code);

  const find = React.useCallback(async () => {
    // Guard re-entry: the "press Enter" hint means a held/repeated Enter fires this before
    // the navigation lands, and the disabled button doesn't cover the keyboard path.
    if (busy) return;
    const normalized = code.trim().toUpperCase();
    setCode(normalized);
    if (!isDealCode(normalized)) {
      setError(t("codeError"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const deal = await getInvitation(normalized);
      // The deal room's invitation query reads the same object; seed it so landing there
      // doesn't refire getInvitation for a code we just resolved.
      queryClient.setQueryData(["invitation", deal.code], deal);
      router.push(`/deals/${encodeURIComponent(deal.code)}`);
    } catch (reason) {
      // A seller who scans their own code still owns a real deal room — send them to it
      // rather than reporting "not found".
      if (reason instanceof ApiError && reason.code === "deal_self_join") {
        router.push(`/deals/${encodeURIComponent(normalized)}`);
        return;
      }
      setError(reason instanceof ApiError && reason.status === 429 ? t("rateLimited") : t("notFound"));
      setBusy(false);
    }
  }, [busy, code, queryClient, router, t]);

  if (payout.isPending) {
    return (
      <AppLayout>
        <Skeleton className="mx-auto h-96 max-w-[520px] rounded-xl" />
      </AppLayout>
    );
  }

  if (payout.data?.canJoinDeal !== true) {
    return (
      <AppLayout
        toolbar={
          <div>
            <h1 className="text-[26px] font-bold">{t("title")}</h1>
            <p className={cn(note, "mt-1")}>{t("subtitle")}</p>
          </div>
        }
      >
        <Alert variant="warning" className="max-w-3xl">
          <AlertTitle>{t("blockedTitle")}</AlertTitle>
          <AlertDescription>{t("blockedBody")}</AlertDescription>
          <Button asChild className="mt-4">
            <Link href="/verify?returnTo=/deals/join">{t("verifyCta")}</Link>
          </Button>
        </Alert>
      </AppLayout>
    );
  }

  const shellState = error ? "error" : focused ? "focused" : "idle";

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-[520px] flex-col items-center pt-[clamp(24px,7vh,72px)] pb-16">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
          <Icon name="protection" className="size-[26px]" />
        </div>

        <h1 className="mt-[22px] text-center text-[30px] font-bold tracking-[-0.03em]">{t("findTitle")}</h1>
        <p className={cn(note, "mt-2 max-w-[360px] text-center text-[15px]")}>{t("findBody")}</p>

        <div className="mt-[34px] w-full">
          <div
            className={cn(
              "rounded-[var(--radius-xl)] border-[1.5px] bg-card px-6 pt-[26px] pb-[22px] transition-[border-color,box-shadow] duration-150",
              shellState === "idle" && "border-border",
              shellState === "focused" &&
                "border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_14%,transparent)]",
              shellState === "error" &&
                "border-destructive shadow-[0_0_0_4px_color-mix(in_srgb,var(--destructive)_14%,transparent)]",
            )}
          >
            <label
              htmlFor="join-code"
              className="block text-center text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
            >
              {t("codeLabel")}
            </label>
            <input
              id="join-code"
              type="text"
              value={code}
              placeholder="SD-XXXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={13}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "join-code-message" : undefined}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void find();
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="mt-3 w-full border-0 bg-transparent text-center font-mono text-[34px] font-bold tracking-[0.22em] text-foreground uppercase caret-primary outline-none placeholder:tracking-[0.22em] placeholder:text-border"
            />
          </div>

          {error ? (
            <p id="join-code-message" className="mt-3 text-center text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            size="lg"
            className="mt-5 w-full justify-center gap-2"
            disabled={!valid}
            loading={busy}
            onClick={() => void find()}
          >
            <span>{t("findCta")}</span>
            <ChevronRightIcon className="size-[18px]" />
          </Button>

          <p className={cn(note, "mt-4 text-center text-[13px]")}>{t.rich("enterHint", { key: (chunks) => <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{chunks}</kbd> })}</p>
        </div>

        <div className="mt-11 flex items-center gap-2 text-muted-foreground">
          <Icon name="protection" className="size-4" />
          <span className="text-[13px]">{t("escrowFootnote")}</span>
        </div>
      </div>
    </AppLayout>
  );
}
