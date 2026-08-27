"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ds";
import { cn } from "@/lib/ds-utils";
import { note } from "@/lib/ui";

type BadgeTone = "success" | "info" | "warning" | "error" | "terminal";
type ActionKind = "outline" | "ghost" | "default" | "destructive";

export interface SettingAction {
  label: string;
  kind?: ActionKind;
  /** Navigates. Mutually exclusive with `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Renders the control disabled with this text as the reason on hover/focus. */
  disabledReason?: string;
  pending?: boolean;
  pendingLabel?: string;
}

/**
 * One line of settings: what it is, what it's currently set to, and how to change it.
 *
 * Every section is built from this. Settings pages go wrong when each row invents its own
 * layout — the eye then has to re-learn where the value lives on every line. One row shape,
 * used fifteen times, means a user learns the page once.
 */
export function SettingRow({
  label,
  value,
  mono = false,
  description,
  badge,
  actions = [],
  last = false,
}: {
  label: string;
  value?: string;
  /** Render the value as tabular mono — for masked contacts, codes and account numbers. */
  mono?: boolean;
  description?: string;
  badge?: { tone: BadgeTone; text: string };
  /** Rendered right-aligned, in order. */
  actions?: SettingAction[];
  /** Drops the divider — set on the final row of a card. */
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 py-4",
        !last && "border-b border-border"
      )}
    >
      <div className="min-w-0 flex-[1_1_240px]">
        <div className="text-sm font-semibold">{label}</div>
        {value ? (
          <div
            className={cn(
              "mt-1 text-muted-foreground",
              mono ? "font-mono text-[13px] tracking-[0.02em]" : "text-[13.5px]"
            )}
          >
            {value}
          </div>
        ) : null}
        {description ? <div className={cn(note, "mt-0.5 text-[12.5px]")}>{description}</div> : null}
      </div>

      {badge ? (
        <Badge variant={badge.tone} className="shrink-0 whitespace-nowrap">
          {badge.text}
        </Badge>
      ) : null}

      {actions.length > 0 ? (
        <div className="flex max-w-full shrink-0 flex-wrap gap-2 max-sm:w-full">
          {actions.map((action) => (
            <RowAction key={action.label} action={action} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowAction({ action }: { action: SettingAction }) {
  const t = useTranslations("common");
  const className = "max-w-full whitespace-nowrap";

  if (action.disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          {/* A disabled button emits no pointer events, so the tooltip needs a live
              wrapper to hang off — otherwise the control refuses to say why it's dead. */}
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                type="button"
                disabled
                variant={action.kind ?? "outline"}
                size="sm"
                className={cn(className, "pointer-events-none")}
              >
                {action.label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{action.disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (action.href) {
    return (
      <Button asChild variant={action.kind ?? "outline"} size="sm" className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={action.onClick}
      disabled={action.pending}
      loading={action.pending}
      aria-busy={action.pending}
      variant={action.kind ?? "outline"}
      size="sm"
      className={className}
    >
      {action.pending ? (action.pendingLabel ?? t("saving")) : action.label}
    </Button>
  );
}
