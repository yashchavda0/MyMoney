"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { firstOccurrence } from "@/lib/recurring/generate";
import { runRecurringForUser } from "@/lib/recurring/run";
import { todayISO } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/", "layout");
}

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return { supabase, userId: data.user.id };
}

const ruleSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be > 0"),
  category_id: z.string().uuid().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  note: z.string().max(200).optional().default(""),
  description: z.string().max(2000).nullable().optional(),
  frequency: z.enum(["daily", "weekday", "weekend", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().min(1).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  day_of_month: z.coerce.number().int().min(1).max(31).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type RuleInput = z.input<typeof ruleSchema>;

export async function createRule(input: RuleInput): Promise<Result> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const data = parsed.data;
  const next_run_on = firstOccurrence({
    frequency: data.frequency,
    interval: data.interval,
    weekdays: data.weekdays ?? null,
    day_of_month: data.day_of_month ?? null,
    start_date: data.start_date,
  });
  const { error } = await supabase
    .from("recurring_rules")
    .insert({ ...data, user_id: userId, next_run_on, active: true });
  if (error) return { ok: false, error: error.message };
  // Immediately materialize anything already due (e.g. a past start_date).
  await runRecurringForUser(supabase, userId, todayISO());
  refresh();
  return { ok: true };
}

export async function updateRule(id: string, input: RuleInput): Promise<Result> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await requireUserId();
  const data = parsed.data;
  const next_run_on = firstOccurrence({
    frequency: data.frequency,
    interval: data.interval,
    weekdays: data.weekdays ?? null,
    day_of_month: data.day_of_month ?? null,
    start_date: data.start_date,
  });
  const { error } = await supabase.from("recurring_rules").update({ ...data, next_run_on }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setRuleActive(id: string, active: boolean): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("recurring_rules").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteRule(id: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Materialize due recurring transactions for the signed-in user. Safe to call often. */
export async function catchUpRecurring(): Promise<{ created: number }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { created: 0 };
  const res = await runRecurringForUser(supabase, data.user.id, todayISO());
  if (res.created > 0) refresh();
  return { created: res.created };
}
