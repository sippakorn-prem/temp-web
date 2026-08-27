"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import type { EmailAddressResource, PhoneNumberResource } from "@clerk/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
} from "@/components/ds";
import { Icon } from "@/components/icon";
import { SettingRow, type SettingAction } from "@/components/settings/setting-row";
import { ChangePhoneStep } from "@/components/verification/change-phone-step";
import { CodeStep } from "@/components/verification/code-step";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { cn } from "@/lib/ds-utils";
import { maskEmail, maskPhone } from "@/lib/mask";
import { card, note } from "@/lib/ui";
import {
  RESEND_COOLDOWN_SECONDS,
  SMS_UNAVAILABLE,
  codeFailureKind,
  type CodeFailure,
} from "@/lib/verification";

type View = "overview" | "code" | "change" | "success";
type Channel = "email" | "phone";

/**
 * Verification centre (DESIGN-BRIEFS.md brief 2).
 *
 * Two doors lead here and they need different framing: someone who clicked "Account" is
 * doing housekeeping, someone bounced out of "create a deal" is mid-task and wants to know
 * how to get back. `entry` decides the banner, the escape hatch and where success returns
 * to — the screen is otherwise identical, because the work is.
 *
 * The gate itself is the backend's to enforce. This only reflects it.
 */
export function VerificationCentre({
  entry,
  returnTo,
  onDone,
}: {
  entry: "account" | "action";
  returnTo: string;
  /** When hosted in a dialog, closes the overlay instead of navigating away on success. */
  onDone?: () => void;
}) {
  const t = useTranslations("verify");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { isLoaded, user } = useUser();

  const [view, setView] = React.useState<View>("overview");
  const [channel, setChannel] = React.useState<Channel>("phone");
  const [failure, setFailure] = React.useState<CodeFailure | null>(null);
  const [message, setMessage] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  // The number being verified is a *new* Clerk resource until its code checks out — the
  // old one stays primary so a half-finished change can't lock anyone out.
  const [incoming, setIncoming] = React.useState<PhoneNumberResource>();

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!isLoaded) return <Skeleton className="h-64 w-full rounded-xl" />;

  const email = user?.primaryEmailAddress;
  // A phone added at sign-up but left unverified is attached to the user without ever
  // becoming primary, so fall back to the first phone on the account — otherwise the number
  // the user just entered is invisible here and they're stuck adding it again.
  const existingPhone = user?.primaryPhoneNumber ?? user?.phoneNumbers?.[0];
  const phone = incoming ?? existingPhone;
  const emailVerified = email?.verification.status === "verified";
  const phoneVerified = existingPhone?.verification.status === "verified";
  // Deliberately strict, even when SMS is off. Someone who can't verify their phone still
  // needs the overview to explain *why* they're being let through on email alone — a
  // "you're fully verified" card would say the opposite of the notice above it.
  const allDone = Boolean(emailVerified && phoneVerified);

  function fail(error: unknown) {
    const kind = codeFailureKind(error);
    setFailure(kind);
    setMessage(kind === "unknown" ? clerkErrorMessage(error, tCommon("tryAgain")) : undefined);
  }

  async function sendCode(
    next: Channel,
    target?: EmailAddressResource | PhoneNumberResource | null
  ) {
    setPending(true);
    setFailure(null);
    setMessage(undefined);
    try {
      if (next === "email") {
        await (target as EmailAddressResource | undefined)?.prepareVerification({
          strategy: "email_code",
        });
      } else {
        await (target as PhoneNumberResource | undefined)?.prepareVerification();
      }
      setChannel(next);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setView("code");
    } catch (error) {
      fail(error);
      // A send that never landed shouldn't strand the user on an empty code screen.
      if (view !== "code") setMessage(clerkErrorMessage(error, tCommon("tryAgain")));
    } finally {
      setPending(false);
    }
  }

  async function submitCode(code: string) {
    setPending(true);
    setFailure(null);
    setMessage(undefined);
    try {
      if (channel === "email") {
        await email?.attemptVerification({ code });
      } else {
        await phone?.attemptVerification({ code });
        // Promote the just-verified number to primary — a brand-new one, or the sign-up phone
        // that was never made primary — then drop any old primary so there's never a stale
        // number we might text a delivery code to.
        const verified = incoming ?? existingPhone;
        if (verified && user?.primaryPhoneNumber?.id !== verified.id) {
          const previous = user?.primaryPhoneNumber;
          await user?.update({ primaryPhoneNumberId: verified.id });
          if (previous && previous.id !== verified.id) await previous.destroy();
        }
        setIncoming(undefined);
      }
      await user?.reload();
      setView("overview");
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  }

  async function changePhone(e164: string) {
    setPending(true);
    setMessage(undefined);
    try {
      const created = await user?.createPhoneNumber({ phoneNumber: e164 });
      if (!created) return;
      setIncoming(created);
      await created.prepareVerification();
      setChannel("phone");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setFailure(null);
      setView("code");
    } catch (error) {
      setMessage(clerkErrorMessage(error, tCommon("tryAgain")));
    } finally {
      setPending(false);
    }
  }

  if (allDone || view === "success") {
    return (
      <section className={cn(card, "grid justify-items-center gap-2.5 px-7.5 py-9.5 text-center")}>
        <span className="grid size-15 place-items-center rounded-full bg-success-bg text-success">
          <Icon name="complete" className="size-7.5" />
        </span>
        <h2 className="mt-0.5 text-[21px] font-bold tracking-[-0.02em]">{t("success.title")}</h2>
        <p className={cn(note, "max-w-[46ch]")}>{t("success.body")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          {onDone ? (
            <Button onClick={onDone}>{tCommon("close")}</Button>
          ) : (
            <>
              <Button asChild>
                <Link href={returnTo}>
                  {entry === "action" ? t("success.returnToAction") : t("success.returnToAccount")}
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard">{t("success.dashboard")}</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  if (view === "code") {
    return (
      <CodeStep
        channel={channel}
        destination={
          channel === "email"
            ? maskEmail(email?.emailAddress ?? "")
            : maskPhone(phone?.phoneNumber ?? "")
        }
        failure={failure}
        message={message}
        cooldown={cooldown}
        pending={pending}
        onSubmit={submitCode}
        onResend={() => void sendCode(channel, channel === "email" ? email : phone)}
        onBack={() => {
          setView("overview");
          setFailure(null);
        }}
        onChangePhone={() => {
          setView("change");
          setMessage(undefined);
        }}
      />
    );
  }

  if (view === "change") {
    return (
      <ChangePhoneStep
        adding={!existingPhone}
        error={message}
        pending={pending}
        onSubmit={changePhone}
        onBack={() => {
          setView("overview");
          setMessage(undefined);
          setIncoming(undefined);
        }}
      />
    );
  }

  const emailAction: SettingAction = emailVerified
    ? { label: t("change"), kind: "ghost", onClick: onDone ?? (() => router.push("/account")) }
    : {
        label: t("verifyEmail"),
        kind: "default",
        pending: pending && channel === "email",
        onClick: () => void sendCode("email", email),
      };

  const hasPhone = Boolean(existingPhone);
  // Nothing to send a code to yet — "Verify number" would be a button that can only fail,
  // so the only offer is to add one.
  const phoneActions: SettingAction[] = !hasPhone
    ? [{ label: t("addNumber"), kind: "default", onClick: () => setView("change") }]
    : SMS_UNAVAILABLE
      ? [{ label: t("changeNumber"), kind: "ghost", onClick: () => setView("change") }]
      : phoneVerified
        ? [{ label: t("change"), onClick: () => setView("change") }]
        : [
            { label: t("change"), kind: "ghost", onClick: () => setView("change") },
            {
              label: t("verifyPhone"),
              kind: "default",
              pending: pending && channel === "phone",
              onClick: () => void sendCode("phone", phone),
            },
          ];

  const remaining = [emailVerified, phoneVerified].filter((done) => !done).length;

  return (
    <>
      <Alert variant={entry === "action" ? "warning" : "default"} role="status" className="mb-4">
        <Icon name={entry === "action" ? "warning" : "protection"} />
        <AlertTitle>{t(`banner.${entry}.title`)}</AlertTitle>
        <AlertDescription>{t(`banner.${entry}.body`)}</AlertDescription>
      </Alert>

      {SMS_UNAVAILABLE ? (
        <Alert className="mb-4">
          <Icon name="info" />
          <AlertTitle>{t("smsUnavailable.title")}</AlertTitle>
          <AlertDescription>{t("smsUnavailable.body")}</AlertDescription>
        </Alert>
      ) : null}

      <section className={cn(card, "mb-4")}>
        <strong className="text-[15px]">
          {SMS_UNAVAILABLE
            ? t("summary.emailOnlyTitle")
            : t("summary.title", { count: remaining })}
        </strong>
        <p className={cn(note, "mt-1.5 text-[13.5px]")}>
          {SMS_UNAVAILABLE
            ? t("summary.emailOnlyBody")
            : t("summary.body", { count: remaining })}
        </p>
        {/* The security framing undersells it. The phone number is how a courier and how
            we reach someone mid-delivery — worth saying, because "for your security" is
            what everyone says and nobody reads. */}
        <div className="mt-3 flex gap-2.5 rounded-lg bg-info-bg p-3">
          <span className="shrink-0 text-info">
            <Icon name="shipment" className="size-4.5" />
          </span>
          <p className="m-0 text-[12.5px] text-muted-foreground">{t("whyPhone")}</p>
        </div>
      </section>

      <section className={card}>
        <div className="mb-0.5 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {t("channels")}
        </div>
        <SettingRow
          label={t("email")}
          value={email ? maskEmail(email.emailAddress) : "—"}
          mono
          badge={
            emailVerified
              ? { tone: "success", text: tCommon("verified") }
              : { tone: "warning", text: t("unverified") }
          }
          actions={[emailAction]}
        />
        <SettingRow
          label={t("phone")}
          value={existingPhone ? maskPhone(existingPhone.phoneNumber) : t("noPhone")}
          mono
          badge={
            SMS_UNAVAILABLE
              ? { tone: "terminal", text: t("smsUnavailable.badge") }
              : phoneVerified
                ? { tone: "success", text: tCommon("verified") }
                : { tone: "warning", text: t("unverified") }
          }
          actions={phoneActions}
          last
        />
        {message && view === "overview" ? (
          <p className="pt-3 text-[13px] text-destructive">{message}</p>
        ) : null}
      </section>
    </>
  );
}

/** The title block and escape hatch, rendered into the chrome's toolbar slot. */
export function VerificationHeader({
  entry,
  returnTo,
}: {
  entry: "account" | "action";
  returnTo: string;
}) {
  const t = useTranslations("verify");
  return (
    <>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">{t("title")}</h1>
        <p className={cn(note, "mt-1 text-[13.5px]")}>{t("subtitle")}</p>
      </div>
      {/* Always a way out. A verification wall with no door is how a signed-in user ends
          up force-quitting the tab rather than coming back later. */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="shrink-0 whitespace-nowrap text-muted-foreground"
      >
        <Link href={entry === "action" ? returnTo : "/account"}>
          {entry === "action" ? t("later") : t("backToAccount")}
        </Link>
      </Button>
    </>
  );
}
