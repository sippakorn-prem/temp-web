// Recurring surface recipes from the design. The prototype expressed these as CSS
// classes (`.card`, `.note`, `.money`); here they are Tailwind strings over the same
// design-system tokens, so there is still exactly one definition of each.

/** The standard content surface: 20px padding, hairline border, xl radius, sm elevation. */
export const card = "rounded-xl border border-border bg-card p-5 shadow-sm";

/** A card that navigates on click — lifts and warms its border on hover. */
export const cardInteractive =
  "cursor-pointer transition-all duration-150 hover:-translate-y-px hover:border-primary/35 hover:shadow-md focus-visible:border-ring";

/** Secondary copy: 13px, muted. */
export const note = "text-[13px] text-muted-foreground";

/** Monetary amounts — tabular figures so columns of money line up. */
export const money = "font-mono font-bold tracking-tight tabular-nums";

/** Deal short codes and other identifiers. */
export const code = "font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground";

/** Initials bubble used for counterparties. */
export const avatar =
  "grid shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground";
