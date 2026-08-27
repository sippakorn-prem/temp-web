import * as React from "react";
import { cn } from "@/lib/ds-utils";
import { Brand } from "@/components/brand";
import { card, note } from "@/lib/ui";

/**
 * The centered column every auth screen sits in: brand + heading, then stacked
 * blocks (alerts, the card, a footer line). Matches the prototype's 80vh centered
 * layout with a 22px stack gap.
 */
export function AuthShell({
  title,
  subtitle,
  width = "narrow",
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  /** 420px for single-column forms, 460px for the sign-up flow. */
  width?: "narrow" | "wide";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-5 py-12">
      <div
        className={cn(
          "grid w-full gap-5.5",
          width === "narrow" ? "max-w-[420px]" : "max-w-[460px]"
        )}
      >
        <div className="grid justify-items-center gap-1.5 text-center">
          <Brand className="text-[19px]" />
          {title ? <h1 className="mt-1.5 text-2xl font-semibold">{title}</h1> : null}
          {subtitle ? <p className={note}>{subtitle}</p> : null}
        </div>

        {children}

        {footer ? (
          <p className="text-center text-[13px] text-muted-foreground">{footer}</p>
        ) : null}
      </div>
    </main>
  );
}

/** The white surface auth forms live on. */
export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(card, "grid gap-4", className)}>{children}</div>;
}
