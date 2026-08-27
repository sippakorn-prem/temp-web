const CREDENTIAL_ENTRY_PATHS = ["/sign-in", "/sign-up", "/reset-password"] as const;

/** Native, segment-aware path matching for the Proxy's signed-in UX redirect. */
export function isCredentialEntryPath(pathname: string): boolean {
  return CREDENTIAL_ENTRY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
