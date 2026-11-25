
import { describe, it, expect } from "vitest";

function toPaise(amount: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error("Invalid amount");
  }
  return Math.round(Number(amount) * 100);
}

describe("FinCore money validation", () => {
  it("converts rupees into paise", () => {
    expect(toPaise("100.50")).toBe(10050);
  });

  it("handles whole rupee amounts", () => {
    expect(toPaise("200")).toBe(20000);
  });

  it("rejects invalid amounts", () => {
    expect(() => toPaise("-50")).toThrow("Invalid amount");
  });

  it("rejects more than two decimal places", () => {
    expect(() => toPaise("10.999")).toThrow("Invalid amount");
  });
});
