import type { Appearance } from "@clerk/types";

// SafeDeal skin for Clerk's prebuilt components. We keep Clerk's flows (OTP, OAuth,
// CAPTCHA, reset) but restyle every element with design-system tokens/utilities, so
// the auth UI is fully SafeDeal — not Clerk's default look. Classes are Tailwind
// utilities backed by DS CSS variables, so this also follows the `.dark` variant.
//
// `variables` set the base palette Clerk derives shades from; `elements` override
// specific parts. Add more element keys here as needed — the full list is in Clerk's
// appearance docs.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorText: "var(--card-foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    colorDanger: "var(--destructive)",
    colorNeutral: "var(--foreground)",
    colorShimmer: "var(--muted)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-card border border-border shadow-sm rounded-xl",
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",

    socialButtonsBlockButton:
      "border border-input bg-background text-foreground hover:bg-accent",
    socialButtonsBlockButtonText: "text-foreground font-medium",

    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",

    formFieldLabel: "text-foreground",
    formFieldInput:
      "bg-background border border-input text-foreground rounded-md focus:ring-2 focus:ring-ring",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
    formFieldAction: "text-primary hover:opacity-90",

    formButtonPrimary:
      "bg-primary text-primary-foreground hover:opacity-90 rounded-md normal-case",
    formButtonReset: "text-muted-foreground hover:text-foreground",

    otpCodeFieldInput: "border border-input text-foreground rounded-md",
    formResendCodeLink: "text-primary hover:opacity-90",

    identityPreview: "bg-muted border border-border",
    identityPreviewEditButton: "text-primary",

    footerActionText: "text-muted-foreground",
    footerActionLink: "text-primary hover:opacity-90 font-medium",

    badge: "bg-accent text-accent-foreground",
    alert: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};
