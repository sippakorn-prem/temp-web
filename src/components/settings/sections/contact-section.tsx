"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { SettingRow, type SettingAction } from "@/components/settings/setting-row";
import { VerificationCentre } from "@/components/verification/verification-centre";
import { maskEmail, maskPhone } from "@/lib/mask";
import { card, note } from "@/lib/ui";

/**
 * Contact and verification.
 *
 * Both actions open the verification centre in a dialog rather than editing inline — changing
 * the address a payout confirmation goes to is not a text field, it's a re-verification — but
 * the seller never leaves settings to do it. The closing note exists because "I typed my
 * number wrong" is the single most common thing that goes wrong here, and the fix is otherwise
 * invisible.
 */
export function ContactSection() {
  const t = useTranslations("settings.contact");
  const tCommon = useTranslations("common");
  const tVerify = useTranslations("verify");
  const { user } = useUser();

  const [open, setOpen] = React.useState(false);
  const openVerify = () => setOpen(true);

  const email = user?.primaryEmailAddress;
  // Show a phone added at sign-up even if it never became primary (unverified), so the
  // seller can find and verify it here rather than thinking it never saved.
  const phone = user?.primaryPhoneNumber ?? user?.phoneNumbers?.[0];
  const emailVerified = email?.verification.status === "verified";
  const phoneVerified = phone?.verification.status === "verified";

  const verified = { tone: "success", text: tCommon("verified") } as const;
  const unverified = { tone: "warning", text: t("unverified") } as const;

  const phoneActions: SettingAction[] = phoneVerified
    ? [{ label: t("change"), kind: "ghost", onClick: openVerify }]
    : [
        { label: t("change"), kind: "ghost", onClick: openVerify },
        { label: t("verifyPhone"), kind: "default", onClick: openVerify },
      ];

  return (
    <>
      <div
        className={cn(
          card,
          (!emailVerified || !phoneVerified) && "border-warning-border",
        )}
      >
        <SettingRow
          label={t("email")}
          value={email ? maskEmail(email.emailAddress) : "—"}
          mono
          badge={emailVerified ? verified : unverified}
          actions={[{ label: t("change"), kind: "ghost", onClick: openVerify }]}
        />
        <SettingRow
          label={t("phone")}
          value={phone ? maskPhone(phone.phoneNumber) : t("noPhone")}
          mono
          badge={phoneVerified ? verified : unverified}
          actions={phoneActions}
          last
        />
        <div className={cn(note, "pt-3.5 text-[12.5px]")}>{t("wrongNumber")}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[560px]" closeLabel={tCommon("close")}>
          <DialogTitle>{tVerify("title")}</DialogTitle>
          <DialogDescription>{tVerify("subtitle")}</DialogDescription>
          <VerificationCentre entry="account" returnTo="/account" onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
