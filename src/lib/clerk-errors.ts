import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

/**
 * One error convention for the auth screens.
 *
 * Clerk's signals API returns `{ error }` rather than throwing, and that error carries a
 * `longMessage` written for end users ("Incorrect code", "Couldn't find your account").
 * Prefer it, fall back to the caller's copy, and never swallow the failure silently.
 */
export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;

  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    return first?.longMessage ?? first?.message ?? fallback;
  }

  const clerkError = error as { longMessage?: string; message?: string };
  return clerkError.longMessage ?? clerkError.message ?? fallback;
}
