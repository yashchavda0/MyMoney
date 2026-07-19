import { describe, it, expect } from "vitest";
import { shouldShowFab } from "@/lib/nav";

describe("shouldShowFab", () => {
  it("shows on the dashboard root", () => {
    expect(shouldShowFab("/")).toBe(true);
  });

  it("shows on monthly and calendar", () => {
    expect(shouldShowFab("/monthly")).toBe(true);
    expect(shouldShowFab("/calendar")).toBe(true);
  });

  it("hides on view-only pages", () => {
    expect(shouldShowFab("/transactions")).toBe(false);
    expect(shouldShowFab("/statistics")).toBe(false);
    expect(shouldShowFab("/review")).toBe(false);
    expect(shouldShowFab("/recurring")).toBe(false);
    expect(shouldShowFab("/settings")).toBe(false);
  });

  it("does not match substring look-alike routes", () => {
    expect(shouldShowFab("/monthlyarchive")).toBe(false);
    expect(shouldShowFab("/calendar-export")).toBe(false);
  });

  it("matches nested cluster subpaths", () => {
    expect(shouldShowFab("/monthly/2026-07")).toBe(true);
  });
});
