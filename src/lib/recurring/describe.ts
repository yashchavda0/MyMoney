import type { RecurringRule } from "@/lib/supabase/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Plain-English summary of a recurring rule's schedule. */
export function describeRule(
  rule: Pick<RecurringRule, "frequency" | "interval" | "weekdays" | "day_of_month" | "start_date">,
): string {
  const n = Math.max(1, rule.interval || 1);
  const every = n === 1 ? "Every" : `Every ${n}`;

  switch (rule.frequency) {
    case "daily":
      return n === 1 ? "Every day" : `Every ${n} days`;
    case "weekday":
      return "Every weekday (Mon–Fri)";
    case "weekend":
      return "Every weekend (Sat–Sun)";
    case "weekly": {
      const days = rule.weekdays && rule.weekdays.length > 0
        ? rule.weekdays.map((d) => DOW[d]).join(", ")
        : DOW[new Date(rule.start_date).getDay()];
      return `${every} week${n > 1 ? "s" : ""} on ${days}`;
    }
    case "monthly": {
      const day = rule.day_of_month ?? Number(rule.start_date.slice(8, 10));
      return `${every} month${n > 1 ? "s" : ""} on the ${ordinal(day)}`;
    }
    case "yearly":
      return `${every} year${n > 1 ? "s" : ""} on ${rule.start_date.slice(5)}`;
    default:
      return "Custom";
  }
}
