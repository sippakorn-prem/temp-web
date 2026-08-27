import { cn } from "@/lib/ds-utils";

/**
 * The SafeDeal wordmark: the interlocking-hooks mark in the brand green followed
 * by the name. Sized in em so it scales with whatever font-size the caller sets.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 font-bold tracking-[-0.02em] text-foreground",
        className
      )}
    >
      <SafeDealMark className="size-[1.42em] shrink-0 fill-brand" />
      <span className="sd-brand__word">SafeDeal</span>
    </span>
  );
}

/**
 * The bare SafeDeal mark (no wordmark). Fills with `currentColor` via `fill-*`,
 * so set the colour on the element. viewBox matches the source artwork.
 */
export function SafeDealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 33" aria-hidden className={className}>
      <path d="M22.1792 11.0459L3.78028 10.2284C0.227297 10.0689 -0.374836 16.9914 3.83611 17.1071L15.2886 17.4181L14.4113 28.9384C14.1441 32.4435 20.9869 32.8144 21.1823 29.2494L22.1792 11.0459Z" />
      <path d="M33.0734 0.976971L14.6744 0.159506C11.1215 8.04663e-07 10.5193 6.92254 14.7303 7.03818L26.1788 7.34921L25.3055 18.8695C25.0383 22.3786 31.8811 22.7495 32.0765 19.1805L33.0734 0.976971Z" />
    </svg>
  );
}
