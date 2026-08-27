/**
 * PDPA consent capture (CLAUDE.md golden rule 7: consent is explicit and recorded).
 *
 * The user's choices are written to Clerk `unsafeMetadata` at sign-up so they survive
 * the flow, and mirrored to our backend, which is the legal record — it stamps the
 * request IP and writes `consent_records`.
 *
 */

/** Bump when the wording of the Terms or Privacy Notice changes. */
export const CONSENT_VERSION = "2026-08-01";

export interface ConsentChoices {
  termsOfService: boolean;
  privacyNotice: boolean;
  marketingEmails: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  version: string;
  acceptedAt: string;
}

export function buildConsentRecord(choices: ConsentChoices, acceptedAt: Date): ConsentRecord {
  return { ...choices, version: CONSENT_VERSION, acceptedAt: acceptedAt.toISOString() };
}

export async function recordConsent(record: ConsentRecord): Promise<void> {
  // Clerk's user webhook and the browser can arrive in either order. A short bounded
  // retry lets the projection land without hiding a persistent identity-sync failure.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch("/api/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyVersion: record.version,
        acceptedAt: record.acceptedAt,
        terms: record.termsOfService,
        privacy: record.privacyNotice,
        marketing: record.marketingEmails,
      }),
    });
    if (response.status === 409 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Consent request failed (${response.status})`);
    }
    return;
  }
}
