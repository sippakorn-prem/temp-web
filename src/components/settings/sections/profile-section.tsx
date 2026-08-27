"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Alert, AlertTitle, Button, FormField } from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { Icon } from "@/components/icon";
import { SettingRow } from "@/components/settings/setting-row";
import { UserAvatar } from "@/components/user-avatar";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { formatMonthYear } from "@/lib/format";
import { card, note } from "@/lib/ui";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Profile: the photo and display name a counterparty sees before deciding to trade with
 * you. It's a trust surface, not a vanity one — which is why the copy for the empty avatar
 * says what happens instead (initials) rather than nagging for an upload.
 *
 * The name is read-only until you ask to edit it. A settings page full of live inputs
 * invites accidental edits and leaves you unsure whether anything was saved.
 */
export function ProfileSection() {
  const t = useTranslations("settings.profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useUser();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [imageAction, setImageAction] = React.useState<"upload" | "remove" | null>(null);

  const imageBusy = imageAction !== null;

  const displayName = user?.fullName ?? "";
  const memberSince = user?.createdAt
    ? (formatMonthYear(user.createdAt, locale) ?? "—")
    : "—";

  function startEditing() {
    setName(displayName);
    setError("");
    setSaved(false);
    setEditing(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Clerk stores a first and last name, the product shows one string. Everything up to
      // the last space is the first name, so "ณัฐธิดา วงศ์สุวรรณ" survives a round trip.
      const cut = trimmed.lastIndexOf(" ");
      await user?.update({
        firstName: cut === -1 ? trimmed : trimmed.slice(0, cut),
        lastName: cut === -1 ? "" : trimmed.slice(cut + 1),
      });
      setEditing(false);
      setSaved(true);
    } catch (cause) {
      setError(clerkErrorMessage(cause, tCommon("tryAgain")));
    } finally {
      setSaving(false);
    }
  }

  async function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a failure.
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t("imageTooLarge"));
      return;
    }
    setImageAction("upload");
    setError("");
    try {
      await user?.setProfileImage({ file });
      toast.success(t("photoUpdated"));
    } catch (cause) {
      setError(clerkErrorMessage(cause, tCommon("tryAgain")));
    } finally {
      setImageAction(null);
    }
  }

  async function removeImage() {
    setImageAction("remove");
    setError("");
    try {
      await user?.setProfileImage({ file: null });
      toast.success(t("photoRemoved"));
    } catch (cause) {
      setError(clerkErrorMessage(cause, tCommon("tryAgain")));
    } finally {
      setImageAction(null);
    }
  }

  return (
    <>
      {saved ? (
        <Alert variant="success" role="status" className="mb-4">
          <Icon name="check" />
          <AlertTitle>{t("saved")}</AlertTitle>
        </Alert>
      ) : null}

      <div className={card}>
        <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
          <UserAvatar name={displayName} src={user?.imageUrl} size={64} />
          <div className="min-w-40 flex-1">
            <div className="text-sm font-semibold">{t("photo")}</div>
            <div className={cn(note, "mt-0.5 text-[12.5px]")}>{t("photoHint")}</div>
          </div>
          <div className="flex max-w-full shrink-0 flex-wrap gap-2 max-sm:w-full">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg"
              onChange={pickImage}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={imageBusy}
              loading={imageAction === "upload"}
              aria-busy={imageAction === "upload"}
              onClick={() => fileInput.current?.click()}
            >
              {imageAction !== "upload" ? <Icon name="image" className="size-[15px]" /> : null}
              {imageAction === "upload" ? t("uploading") : t("upload")}
            </Button>
            {user?.hasImage ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={imageBusy}
                loading={imageAction === "remove"}
                aria-busy={imageAction === "remove"}
                onClick={removeImage}
              >
                {imageAction === "remove" ? t("removingPhoto") : t("removePhoto")}
              </Button>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="border-b border-border py-4">
            <FormField
              label={t("displayName")}
              error={error}
              containerClassName="max-w-105"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("displayNamePlaceholder")}
            />
            <div className="mt-3.5 flex gap-2.5">
              <Button loading={saving} onClick={save}>
                {tCommon("save")}
              </Button>
              <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <SettingRow
            label={t("displayName")}
            value={displayName || t("noName")}
            actions={[{ label: tCommon("edit"), onClick: startEditing }]}
          />
        )}

        <SettingRow label={t("memberSince")} value={memberSince} last />
      </div>

      {!editing && error ? (
        <p className="mt-3 text-[13px] text-destructive">{error}</p>
      ) : null}
    </>
  );
}
