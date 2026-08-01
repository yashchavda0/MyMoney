import { describe, it, expect } from "vitest";
import { nextDashboardHref } from "@/lib/dashboard-nav";

describe("nextDashboardHref", () => {
  it("steps from Daily to Monthly, deriving month from day", () => {
    expect(nextDashboardHref("/", 1, { day: "2026-07-18" })).toBe(
      "/monthly?m=2026-07",
    );
  });

  it("steps from Monthly to Calendar, keeping month", () => {
    expect(nextDashboardHref("/monthly", 1, { month: "2026-07" })).toBe(
      "/calendar?m=2026-07",
    );
  });

  it("steps from Calendar back to Monthly, keeping month", () => {
    expect(nextDashboardHref("/calendar", -1, { month: "2026-07" })).toBe(
      "/monthly?m=2026-07",
    );
  });

  it("steps from Monthly back to Daily, deriving day from month", () => {
    expect(nextDashboardHref("/monthly", -1, { month: "2026-07" })).toBe(
      "/?d=2026-07-01",
    );
  });

  it("clamps at the right end — Calendar can't go further", () => {
    expect(nextDashboardHref("/calendar", 1, { month: "2026-07" })).toBeNull();
  });

  it("clamps at the left end — Daily can't go further back", () => {
    expect(nextDashboardHref("/", -1, { day: "2026-07-18" })).toBeNull();
  });

  it("returns null for routes outside the dashboard cluster", () => {
    expect(nextDashboardHref("/transactions", 1, {})).toBeNull();
  });
});
