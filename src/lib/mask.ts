// Contact details are shown back to their owner in enough shape to be recognised and no
// more — a shoulder-surfer, a screenshot in a support thread, or a screen-share shouldn't
// hand over a working address. Masking is presentation-only; the full values live in Clerk.

/** "warunya@example.com" → "waru••••@example.com". */
export function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return value;
  return `${local.slice(0, 4)}${"•".repeat(4)}@${domain}`;
}

/** "+66812345678" → "•••• 5678". */
export function maskPhone(value: string) {
  return `${"•".repeat(4)} ${value.slice(-4)}`;
}
