"use client";

import * as React from "react";

import { cn } from "@/lib/ds-utils";
import { avatar as avatarRecipe } from "@/lib/ui";
import type { DisputeStatus, EvidenceSide } from "@/lib/domain/dispute";

/** Side → avatar background (matches the design's buyer=info, seller=terminal, admin=primary). */
const SIDE_BG: Record<EvidenceSide, string> = {
  buyer: "var(--info)",
  seller: "var(--terminal)",
  admin: "var(--primary)",
};

/** A circular initials avatar tinted by the party it represents. */
export function Avatar({
  initials,
  side,
  size = 36,
  className,
}: {
  initials: string;
  side: EvidenceSide;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(avatarRecipe, "text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: SIDE_BG[side] }}
    >
      {initials || "?"}
    </span>
  );
}

const SLA_COLOR = {
  ok: "var(--success)",
  warn: "var(--warning)",
  late: "var(--error)",
  resolved: "var(--terminal)",
} as const;

/** A small dot conveying how long an active dispute has waited (green → amber → red). */
export function SlaDot({ level }: { level: keyof typeof SLA_COLOR }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: SLA_COLOR[level] }} />;
}

/** Badge variant for a dispute status. */
export function statusVariant(status: DisputeStatus): "warning" | "info" | "success" | "default" {
  switch (status) {
    case "open":
      return "warning";
    case "under_review":
      return "info";
    case "resolved_buyer":
    case "resolved_seller":
      return "success";
    default:
      return "default";
  }
}

/** Two-letter initials from a display name, for a party we only have a name for. */
export function initialsOf(name: string | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

