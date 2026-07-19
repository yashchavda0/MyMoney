import {
  parse,
  format,
  addDays,
  addMonths,
  addYears,
  getDay,
  getDate,
  lastDayOfMonth,
  setDate,
} from "date-fns";
import type { Frequency, RecurringRule } from "@/lib/supabase/types";

const FMT = "yyyy-MM-dd";

function toDate(s: string): Date {
  return parse(s, FMT, new Date());
}
function toStr(d: Date): string {
  return format(d, FMT);
}

/** Weekday set a frequency operates on (0=Sun..6=Sat), or null if not weekday-based. */
function weekdaySet(rule: Pick<RecurringRule, "frequency" | "weekdays">): number[] | null {
  switch (rule.frequency) {
    case "weekday":
      return [1, 2, 3, 4, 5];
    case "weekend":
      return [0, 6];
    case "weekly":
      return rule.weekdays && rule.weekdays.length > 0 ? [...rule.weekdays].sort((a, b) => a - b) : null;
    default:
      return null;
  }
}

/** Clamp a target day-of-month to a month that may be shorter (e.g. day 31 in Feb → 28/29). */
function onDayOfMonth(d: Date, day: number): Date {
  const last = getDate(lastDayOfMonth(d));
  return setDate(d, Math.min(day, last));
}

type Rule = Pick<
  RecurringRule,
  "frequency" | "interval" | "weekdays" | "day_of_month" | "start_date"
>;

/** The first occurrence on or after start_date. */
export function firstOccurrence(rule: Rule): string {
  const start = toDate(rule.start_date);
  const set = weekdaySet(rule);
  if (!set) return rule.start_date; // daily / monthly / yearly begin on start_date
  let d = start;
  for (let i = 0; i < 14 && !set.includes(getDay(d)); i++) d = addDays(d, 1);
  return toStr(d);
}

/** The next occurrence strictly after `fromStr`, following the rule. */
export function advance(rule: Rule, fromStr: string): string {
  const interval = Math.max(1, rule.interval || 1);
  const from = toDate(fromStr);
  const set = weekdaySet(rule);

  switch (rule.frequency) {
    case "daily":
      return toStr(addDays(from, interval));

    case "weekday":
    case "weekend": {
      let d = addDays(from, 1);
      while (!set!.includes(getDay(d))) d = addDays(d, 1);
      return toStr(d);
    }

    case "weekly": {
      if (!set) return toStr(addDays(from, 7 * interval));
      // Try later weekdays within the current week.
      const cur = getDay(from);
      const later = set.find((w) => w > cur);
      if (later !== undefined) return toStr(addDays(from, later - cur));
      // Otherwise jump `interval` weeks to the first weekday in the set.
      const first = set[0];
      const daysToNextWeekStart = 7 * interval - cur;
      return toStr(addDays(from, daysToNextWeekStart + first));
    }

    case "monthly": {
      const day = rule.day_of_month ?? getDate(toDate(rule.start_date));
      return toStr(onDayOfMonth(addMonths(from, interval), day));
    }

    case "yearly": {
      const day = rule.day_of_month ?? getDate(toDate(rule.start_date));
      return toStr(onDayOfMonth(addYears(from, interval), day));
    }

    default:
      return toStr(addDays(from, 1));
  }
}

export interface DueResult {
  /** Dates (yyyy-MM-dd) that should be materialized now, from next_run_on up to today. */
  due: string[];
  /** The rule's next_run_on after materializing (first date beyond today / end_date). */
  nextRunOn: string;
  /** True when the rule has passed its end_date and should be deactivated. */
  exhausted: boolean;
}

/**
 * Given a rule's current next_run_on and today's date, list every occurrence due
 * (inclusive) and compute the new next_run_on. Idempotent by design — the DB unique
 * index on (recurring_rule_id, occurred_on) also prevents duplicate inserts.
 */
export function dueOccurrences(
  rule: Rule & { next_run_on: string; end_date: string | null },
  todayStr: string,
): DueResult {
  const due: string[] = [];
  let cursor = rule.next_run_on;
  const guard = 3660; // ~10 years of daily occurrences — safety cap

  for (let i = 0; i < guard; i++) {
    if (cursor > todayStr) break;
    if (rule.end_date && cursor > rule.end_date) {
      return { due, nextRunOn: cursor, exhausted: true };
    }
    due.push(cursor);
    cursor = advance(rule, cursor);
  }

  const exhausted = !!rule.end_date && cursor > rule.end_date;
  return { due, nextRunOn: cursor, exhausted };
}
