import { describe, it, expect } from "vitest";
import { formatINRCompact } from "@/lib/format";

describe("formatINRCompact", () => {
  it("shows plain rupees under 1,000", () => {
    expect(formatINRCompact(850)).toBe("₹850");
    expect(formatINRCompact(0)).toBe("₹0");
  });

  it("uses K for thousands", () => {
    expect(formatINRCompact(85000)).toBe("₹85K");
    expect(formatINRCompact(11600)).toBe("₹11.6K");
  });

  it("uses L for lakhs", () => {
    expect(formatINRCompact(120000)).toBe("₹1.2L");
  });

  it("uses Cr for crores", () => {
    expect(formatINRCompact(12000000)).toBe("₹1.2Cr");
  });

  it("keeps the native minus sign for negative amounts", () => {
    expect(formatINRCompact(-85000)).toBe("-₹85K");
    expect(formatINRCompact(-500)).toBe("-₹500");
  });
});
