import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RecurringRule } from "@/lib/supabase/types";
import { dueOccurrences } from "./generate";

type Client = SupabaseClient<Database>;

/**
 * Materialize every due occurrence of the user's active recurring rules up to `today`.
 * Idempotent: rows are upserted on (recurring_rule_id, occurred_on) with duplicates ignored,
 * and each rule's next_run_on advances past today. Returns the number of transactions created.
 */
export async function runRecurringForUser(
  supabase: Client,
  userId: string,
  today: string,
): Promise<{ created: number; rules: number }> {
  const { data: rules } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .lte("next_run_on", today);

  const dueRules = (rules ?? []) as RecurringRule[];
  let created = 0;

  for (const rule of dueRules) {
    const { due, nextRunOn, exhausted } = dueOccurrences(rule, today);

    if (due.length > 0) {
      const rows = due.map((occurred_on) => ({
        user_id: userId,
        occurred_on,
        type: rule.type,
        amount: rule.amount,
        category_id: rule.category_id,
        account_id: rule.account_id,
        note: rule.note,
        description: rule.description,
        recurring_rule_id: rule.id,
        is_bookmarked: false,
      }));

      const { error, count } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "recurring_rule_id,occurred_on", ignoreDuplicates: true, count: "exact" });

      if (!error) created += count ?? rows.length;
    }

    await supabase
      .from("recurring_rules")
      .update({ next_run_on: nextRunOn, active: exhausted ? false : true })
      .eq("id", rule.id);
  }

  return { created, rules: dueRules.length };
}
