import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("accepts the local Thai formats people actually type", () => {
    expect(toE164("081-234-5678")).toBe("+66812345678");
    expect(toE164("081 234 5678")).toBe("+66812345678");
    expect(toE164("0812345678")).toBe("+66812345678");
    expect(toE164(" 0812345678 ")).toBe("+66812345678");
  });

  it("passes an international number through", () => {
    expect(toE164("+66812345678")).toBe("+66812345678");
    expect(toE164("+1 201 555 0101")).toBe("+12015550101");
  });

  it("rejects what Clerk would reject", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("081234")).toBeNull(); // too short
    expect(toE164("08123456789012")).toBeNull(); // too long
    expect(toE164("not a phone")).toBeNull();
    expect(toE164("you@example.com")).toBeNull(); // sign-in takes either
  });
});
