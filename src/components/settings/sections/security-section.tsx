"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useClerk, useReverification, useSession, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExternalAccountResource, SessionWithActivitiesResource } from "@clerk/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Skeleton,
} from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { Icon, type IconName } from "@/components/icon";
import { SettingRow } from "@/components/settings/setting-row";
import { SectionError } from "@/components/settings/section-error";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { formatDateTime } from "@/lib/format";
import { card, note } from "@/lib/ui";

/**
 * Security: the credentials on the account, and — the part that actually matters — every
 * device currently holding a session.
 *
 * The device list is the one control here a worried user needs at 2am, so it gets a card of
 * its own with a single blunt escape hatch at the top. Revoking is per-row and immediate;
 * the current device can't be revoked from here, because signing yourself out while trying
 * to lock an intruder out is a way to lose the race.
 */
export function SecuritySection() {
  const t = useTranslations("settings.security");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [googlePending, setGooglePending] = React.useState<"connect" | "disconnect" | null>(
    null
  );
  const [googleError, setGoogleError] = React.useState("");

  const sessions = useQuery({
    queryKey: ["clerk-sessions"],
    queryFn: () => user?.getSessions() ?? [],
    enabled: Boolean(user),
  });

  const revoke = useMutation({
    mutationFn: (target: SessionWithActivitiesResource) => target.revoke(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clerk-sessions"] }),
  });

  const google = user?.externalAccounts.find((account) => account.provider === "google");
  const googleConnected = google?.verification?.status === "verified";

  const connectGoogleAccount = useReverification(async () => {
    if (!user) return undefined;
    const redirectUrl = "/account?section=security";
    return google
      ? google.reauthorize({ redirectUrl })
      : user.createExternalAccount({ strategy: "oauth_google", redirectUrl });
  });

  const disconnectGoogleAccount = useReverification(
    (account: ExternalAccountResource) => account.destroy()
  );

  async function connectGoogle() {
    setGooglePending("connect");
    setGoogleError("");
    try {
      const account = await connectGoogleAccount();
      const redirect = account?.verification?.externalVerificationRedirectURL;
      if (!redirect) {
        setGoogleError(t("googleConnectionUnavailable"));
        return;
      }
      window.location.assign(redirect.href);
    } catch (cause) {
      setGoogleError(clerkErrorMessage(cause, tCommon("tryAgain")));
    } finally {
      setGooglePending(null);
    }
  }

  async function disconnectGoogle() {
    if (!google) return;
    setGooglePending("disconnect");
    setGoogleError("");
    try {
      await disconnectGoogleAccount(google);
      await user?.reload();
    } catch (cause) {
      setGoogleError(clerkErrorMessage(cause, tCommon("tryAgain")));
    } finally {
      setGooglePending(null);
    }
  }

  return (
    <>
      {googleError ? (
        <Alert variant="error" role="alert" className="mb-4">
          <Icon name="alert" />
          <div>
            <AlertTitle>{t("googleErrorTitle")}</AlertTitle>
            <AlertDescription>{googleError}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <div className={cn(card, "mb-4")}>
        <SettingRow
          label={t("password")}
          value={user?.passwordEnabled ? "••••••••••" : t("noPassword")}
          mono={user?.passwordEnabled}
          actions={[
            { label: t("changePassword"), disabledReason: tCommon("notYetBuilt") },
          ]}
        />
        <SettingRow
          label={t("twoFactor")}
          description={t("twoFactorHint")}
          badge={
            user?.twoFactorEnabled
              ? { tone: "success", text: t("enabled") }
              : { tone: "warning", text: t("notEnabled") }
          }
          actions={[{ label: t("enable"), disabledReason: tCommon("notYetBuilt") }]}
        />
        <SettingRow
          label={t("google")}
          value={googleConnected ? t("connectedTo", { account: google.emailAddress }) : undefined}
          description={googleConnected ? undefined : t("googleHint")}
          badge={
            googleConnected
              ? { tone: "success", text: t("connected") }
              : { tone: "terminal", text: t("notConnected") }
          }
          actions={
            googleConnected
              ? [
                  {
                    label: t("disconnectGoogle"),
                    kind: "ghost",
                    pending: googlePending === "disconnect",
                    pendingLabel: t("disconnectingGoogle"),
                    onClick: () => void disconnectGoogle(),
                  },
                ]
              : [
                  {
                    label: t("connectGoogle"),
                    kind: "outline",
                    pending: googlePending === "connect",
                    pendingLabel: t("connectingGoogle"),
                    onClick: () => void connectGoogle(),
                  },
                ]
          }
          last
        />
      </div>

      <div className={card}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-sm">{t("devices")}</strong>
            <div className={cn(note, "text-[12.5px]")}>{t("devicesHint")}</div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => void signOut({ redirectUrl: "/" })}
          >
            {t("signOutEverywhere")}
          </Button>
        </div>

        {sessions.isPending ? (
          <div className="grid gap-2 pt-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : null}

        {sessions.isError ? (
          <div className="pt-2">
            <SectionError onRetry={() => void sessions.refetch()} />
          </div>
        ) : null}

        {(sessions.data ?? []).map((entry) => {
          const current = entry.id === session?.id;
          const activity = entry.latestActivity;
          const place = [activity?.city, activity?.country].filter(Boolean).join(", ");
          return (
            <div
              key={entry.id}
              className="flex items-center gap-3.5 border-t border-border py-3.5"
            >
              <span className="grid size-9.5 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon name={deviceIcon(activity?.isMobile)} className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{deviceLabel(entry)}</strong>
                  {current ? (
                    <Badge variant="success" className="px-[7px] py-[2px] text-[11px]">
                      {t("thisDevice")}
                    </Badge>
                  ) : null}
                </div>
                <div className={cn(note, "mt-0.5 text-xs")}>
                  {[place, lastActive(entry.lastActiveAt, t("activeNow"), current, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              {current ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  loading={revoke.isPending && revoke.variables?.id === entry.id}
                  onClick={() => revoke.mutate(entry)}
                >
                  {t("signOutDevice")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function deviceIcon(isMobile?: boolean): IconName {
  return isMobile ? "chat" : "settings";
}

function deviceLabel(entry: SessionWithActivitiesResource) {
  const { browserName, deviceType } = entry.latestActivity ?? {};
  return [browserName, deviceType].filter(Boolean).join(" · ") || "—";
}

function lastActive(at: Date, activeNow: string, current: boolean, locale: string) {
  if (current) return activeNow;
  return formatDateTime(at, locale) ?? "—";
}
