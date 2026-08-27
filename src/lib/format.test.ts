import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("date formatting", () => {
  it("uses the Gregorian calendar for Thai copy", () => {
    const result = formatDate("2026-08-15T12:00:00Z", "th");
    expect(result).toContain("2026");
    expect(result).not.toContain("2569");
  });

  it("returns null for an invalid timestamp", () => {
    expect(formatDate("not-a-date", "en")).toBeNull();
    expect(formatDateTime("not-a-date", "th")).toBeNull();
  });
});
