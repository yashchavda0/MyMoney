import { describe, it, expect } from "vitest";
import { firstOccurrence, advance, dueOccurrences } from "./generate";

// 2026-01-01 is a Thursday. Weekdays that January:
// Thu 01, Fri 02, Sat 03, Sun 04, Mon 05, Tue 06, Wed 07, Thu 08, Fri 09.

const base = { interval: 1, weekdays: null, day_of_month: null };

describe("advance", () => {
  it("daily every 1 day", () => {
    expect(advance({ ...base, frequency: "daily", start_date: "2026-01-01" }, "2026-01-01")).toBe("2026-01-02");
  });

  it("daily every 3 days", () => {
    expect(advance({ ...base, frequency: "daily", interval: 3, start_date: "2026-01-01" }, "2026-01-01")).toBe("2026-01-04");
  });

  it("weekday skips the weekend", () => {
    // Friday -> Monday
    expect(advance({ ...base, frequency: "weekday", start_date: "2026-01-02" }, "2026-01-02")).toBe("2026-01-05");
  });

  it("weekend hops Sat -> Sun -> next Sat", () => {
    expect(advance({ ...base, frequency: "weekend", start_date: "2026-01-03" }, "2026-01-03")).toBe("2026-01-04");
    expect(advance({ ...base, frequency: "weekend", start_date: "2026-01-03" }, "2026-01-04")).toBe("2026-01-10");
  });

  it("weekly on Mon/Wed/Fri", () => {
    const r = { ...base, frequency: "weekly" as const, weekdays: [1, 3, 5], start_date: "2026-01-05" };
    expect(advance(r, "2026-01-05")).toBe("2026-01-07"); // Mon -> Wed
    expect(advance(r, "2026-01-07")).toBe("2026-01-09"); // Wed -> Fri
    expect(advance(r, "2026-01-09")).toBe("2026-01-12"); // Fri -> next Mon
  });

  it("monthly clamps day 31 to short months, then re-expands", () => {
    const r = { ...base, frequency: "monthly" as const, day_of_month: 31, start_date: "2026-01-31" };
    expect(advance(r, "2026-01-31")).toBe("2026-02-28");
    expect(advance(r, "2026-02-28")).toBe("2026-03-31");
  });

  it("yearly clamps Feb 29 in non-leap years", () => {
    const r = { ...base, frequency: "yearly" as const, day_of_month: 29, start_date: "2024-02-29" };
    expect(advance(r, "2024-02-29")).toBe("2025-02-28");
  });
});

describe("firstOccurrence", () => {
  it("weekday rule starting on a Saturday moves to Monday", () => {
    expect(firstOccurrence({ ...base, frequency: "weekday", start_date: "2026-01-03" })).toBe("2026-01-05");
  });
  it("daily rule starts on start_date", () => {
    expect(firstOccurrence({ ...base, frequency: "daily", start_date: "2026-01-01" })).toBe("2026-01-01");
  });
});

describe("dueOccurrences", () => {
  it("materializes every day up to today", () => {
    const res = dueOccurrences(
      { ...base, frequency: "daily", start_date: "2026-01-01", next_run_on: "2026-01-01", end_date: null },
      "2026-01-05",
    );
    expect(res.due).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]);
    expect(res.nextRunOn).toBe("2026-01-06");
    expect(res.exhausted).toBe(false);
  });

  it("stops at end_date and marks exhausted", () => {
    const res = dueOccurrences(
      { ...base, frequency: "daily", start_date: "2026-01-01", next_run_on: "2026-01-01", end_date: "2026-01-03" },
      "2026-01-10",
    );
    expect(res.due).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(res.exhausted).toBe(true);
  });

  it("returns nothing when next_run_on is in the future", () => {
    const res = dueOccurrences(
      { ...base, frequency: "daily", start_date: "2026-02-01", next_run_on: "2026-02-01", end_date: null },
      "2026-01-10",
    );
    expect(res.due).toEqual([]);
    expect(res.nextRunOn).toBe("2026-02-01");
  });
});
