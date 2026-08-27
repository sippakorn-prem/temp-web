import { describe, expect, it } from "vitest";
import { feeBreakdown, formatFeePercent, parseBahtToSatang } from "./money";

describe("parseBahtToSatang", () => {
  it.each([
    ["0", 0], ["1", 100], ["1.5", 150], ["1.05", 105], ["68,000.00", 6_800_000],
  ])("parses %s exactly", (input, expected) => expect(parseBahtToSatang(input)).toBe(expected));

  it.each(["", "-1", "1.001", "1e3", "NaN", "฿100", "1,2x"])("rejects %s", (input) => {
    expect(parseBahtToSatang(input)).toBeNull();
  });
});

describe("feeBreakdown", () => {
  it.each([
    [12_300, 300, 369, 11_931],
    [101, 300, 3, 98],
    [1, 300, 0, 1],
  ])(
    "keeps gross equal to fee plus net for %i satang at %i bps",
    (grossSatang, feeBPS, feeSatang, netSatang) => {
      const result = feeBreakdown(grossSatang, feeBPS);
      expect(result).toEqual({ grossSatang, feeSatang, netSatang });
      expect(result.grossSatang).toBe(result.feeSatang + result.netSatang);
    }
  );

  it.each([
    [300, "3%"],
    [325, "3.25%"],
    [305, "3.05%"],
  ])("formats %i basis points as %s", (feeBPS, expected) => {
    expect(formatFeePercent(feeBPS)).toBe(expected);
  });
});
