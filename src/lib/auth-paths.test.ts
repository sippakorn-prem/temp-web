import { describe, expect, it } from "vitest";
import { isCredentialEntryPath } from "./auth-paths";

describe("isCredentialEntryPath", () => {
  it.each([
    "/sign-in",
    "/sign-in/factor-one",
    "/sign-up",
    "/sign-up/continue",
    "/reset-password",
  ])("matches credential-entry path %s", (pathname) => {
    expect(isCredentialEntryPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/dashboard",
    "/sso-callback",
    "/sign-in-legacy",
    "/sign-updates",
    "/reset-passwords",
  ])("does not overmatch public or signed-in path %s", (pathname) => {
    expect(isCredentialEntryPath(pathname)).toBe(false);
  });
});
