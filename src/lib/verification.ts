/**
 * Why a one-time code was rejected.
 *
 * The four outcomes need four different screens, and only one of them is the user's
 * fault. Lumping them into "that didn't work" leaves someone re-typing a code that
 * expired four minutes ago, or hammering a locked endpoint — so the kind is derived
 * once, here, from what Clerk actually said.
 */
export type CodeFailure = "incorrect" | "expired" | "ratelimited" | "unknown";

/**
 * Matched on shape rather than `isClerkAPIResponseError`. That guard is an `instanceof`
 * check, which quietly returns false whenever two copies of the Clerk package end up in
 * the graph — and the failure mode would be every rejected code rendering as a generic
 * error. The `errors` array is what distinguishes a Clerk response from any other throw.
 */
export function codeFailureKind(error: unknown): CodeFailure {
  const response = error as { status?: number; errors?: { code?: string }[] } | null;
  const first = Array.isArray(response?.errors) ? response.errors[0] : undefined;
  if (!first) return "unknown";

  // Clerk answers 429 for both "too many codes requested" and "too many attempts";
  // either way the honest thing to say is "wait".
  if (response?.status === 429) return "ratelimited";

  const code = first.code ?? "";
  if (code.includes("expired")) return "expired";
  if (code.includes("incorrect") || code.includes("invalid")) return "incorrect";
  return "unknown";
}

/**
 * SafeDeal ships to Thailand before SMS delivery there is switched on. When that's the
 * case the verification centre degrades to email-only and says so, rather than parking
 * users in front of a button that can only fail.
 */
export const SMS_UNAVAILABLE = process.env.NEXT_PUBLIC_SMS_VERIFICATION_DISABLED === "1";

/** Seconds before a new code can be requested. Matches Clerk's own throttle. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Where `?next=` is allowed to send someone after they verify.
 *
 * Only same-origin paths. An open redirect is bad anywhere, and worse here: this is the
 * one screen that has just finished telling the user it is keeping them safe, so a link
 * off it carries borrowed trust. `//evil.com` and `https://evil.com` are both rejected —
 * the first is protocol-relative and reads as a path if you only check the leading slash.
 */
export function safeReturnTo(next: string | null, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  // A backslash is a path separator to some URL parsers, so `/\evil.com` can escape too.
  if (next.includes("\\")) return fallback;
  return next;
}
