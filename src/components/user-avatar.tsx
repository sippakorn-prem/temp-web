"use client";

import { cn } from "@/lib/ds-utils";

/**
 * The account avatar: the user's photo, or their initials on the brand green.
 *
 * Everything scales off `size`. The design expresses the initials (0.4em) and the
 * unverified pip (0.34em, with a 0.085em ring) in em, so one number drives the whole
 * component and the 36px mobile avatar is the 40px sidebar one, shrunk.
 *
 * `ring` is the colour the pip punches out of — the dark sidebar on desktop, the
 * card-coloured top bar on mobile. It has to match the surface behind the avatar or
 * the pip reads as a smudge rather than a deliberate marker.
 */
export function UserAvatar({
  name,
  initials: given,
  src,
  size,
  pip = false,
  pipLabel,
  ring = "var(--card)",
  className,
}: {
  name: string;
  /** Overrides the derived initials — pass when the server already computed them. */
  initials?: string;
  /** Photo URL. Falls back to initials when empty. */
  src?: string | null;
  /** Rendered size in px; also the em basis for the initials and pip. */
  size: number;
  /** Show the amber "something needs verifying" dot. */
  pip?: boolean;
  pipLabel?: string;
  ring?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center leading-none", className)}
      style={{ width: size, height: size, fontSize: size }}
    >
      <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-primary text-[0.4em] font-bold text-primary-foreground">
        {src ? (
          // The photo is decorative: the name it belongs to is always rendered beside it,
          // or announced by the trigger's aria-label.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="block size-full object-cover" />
        ) : (
          <span>{given ?? initials(name)}</span>
        )}
      </span>
      {pip ? (
        <span
          role="img"
          aria-label={pipLabel}
          className="absolute right-[2%] bottom-[2%] size-[0.34em] rounded-full bg-warning"
          style={{ boxShadow: `0 0 0 0.085em ${ring}` }}
        />
      ) : null}
    </span>
  );
}

/**
 * "Warunya Chaidee" → "WC", "ณัฐธิดา วงศ์สุวรรณเจริญกิตติ" → "ณว", "warunya" → "WA".
 * Only ASCII gets upper-cased — Thai has no case, and forcing it mangles nothing but
 * wastes a pass; the design does the same.
 */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const raw =
    parts.length >= 2 ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}` : parts[0].slice(0, 2);
  return raw.replace(/[a-z]/g, (c) => c.toUpperCase());
}
