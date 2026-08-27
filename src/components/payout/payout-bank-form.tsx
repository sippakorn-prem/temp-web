"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Label } from "@/components/ds";
import type { PayoutOnboardingInput } from "@/lib/api/payout";
import { cn } from "@/lib/ds-utils";

// Omise recipient bank brand codes for Thailand. Brand names are proper nouns, identical
// in Thai and English, so they are constants rather than translated copy.
export const THAI_BANKS: { code: string; name: string }[] = [
  { code: "bbl", name: "Bangkok Bank" },
  { code: "kbank", name: "Kasikornbank" },
  { code: "scb", name: "Siam Commercial Bank" },
  { code: "ktb", name: "Krungthai Bank" },
  { code: "bay", name: "Krungsri (Bank of Ayudhya)" },
  { code: "ttb", name: "TMBThanachart Bank" },
  { code: "gsb", name: "Government Savings Bank" },
  { code: "uob", name: "UOB Thailand" },
  { code: "cimb", name: "CIMB Thai" },
  { code: "kk", name: "Kiatnakin Phatra Bank" },
];

/**
 * The Omise recipient bank form. Shared by the first-run onboarding page and the in-app
 * "connect / replace payout account" dialog, so both surfaces collect the same fields the
 * same way. It owns validation and submission shape only — the caller owns the mutation.
 */
export function PayoutBankForm({
  submitting,
  onSubmit,
  defaultValues,
  submitLabel,
}: {
  submitting: boolean;
  onSubmit: (values: PayoutOnboardingInput) => void;
  defaultValues?: Partial<PayoutOnboardingInput>;
  submitLabel?: string;
}) {
  const t = useTranslations("payout.form");
  const schema = z.object({
    accountName: z.string().trim().min(1, t("accountNameRequired")),
    bankBrand: z.string().min(1, t("bankRequired")),
    // Thai bank account numbers are 10 digits; accept 6–20 to be safe across banks.
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{6,20}$/, t("accountNumberInvalid")),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PayoutOnboardingInput>({
    resolver: zodResolver(schema),
    defaultValues: { accountName: "", bankBrand: "", accountNumber: "", ...defaultValues },
  });

  return (
    <form
      className="grid gap-4 rounded-xl border border-border bg-card p-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <FormField
        label={t("accountName")}
        autoComplete="name"
        error={errors.accountName?.message}
        {...register("accountName")}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="bankBrand">{t("bank")}</Label>
        {/* No Select primitive in the design system yet; a native select styled to match
            the Input keeps the field accessible and on-brand. */}
        <select
          id="bankBrand"
          className={cn(
            "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          defaultValue={defaultValues?.bankBrand ?? ""}
          aria-invalid={Boolean(errors.bankBrand)}
          {...register("bankBrand")}
        >
          <option value="" disabled>
            {t("bankPlaceholder")}
          </option>
          {THAI_BANKS.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
        {errors.bankBrand ? (
          <p className="text-xs text-error">{errors.bankBrand.message}</p>
        ) : null}
      </div>
      <FormField
        label={t("accountNumber")}
        inputMode="numeric"
        autoComplete="off"
        hint={t("accountNumberHint")}
        error={errors.accountNumber?.message}
        {...register("accountNumber")}
      />
      <Button type="submit" size="lg" loading={submitting}>
        {submitLabel ?? t("submit")}
      </Button>
    </form>
  );
}
