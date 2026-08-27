/**
 * "Your account exists in Clerk but our copy of it hasn't landed yet."
 *
 * Sign-up completes against Clerk, and the backend learns about the user from a webhook
 * (with a reconciler as the backstop). Between those two moments every authenticated
 * endpoint answers 409 `user_projection_pending`. That is a wait, not a failure — the
 * screens that can hit it show a waiting state instead of an error.
 *
 * Matched on the code rather than the bare status: 409 also carries real conflicts
 * (`deal_self_join`, `deal_unavailable`) that must never look like a loading state.
 */
export const PROVISIONING_CODE = "user_projection_pending";

export function isProvisioning(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === PROVISIONING_CODE;
}
