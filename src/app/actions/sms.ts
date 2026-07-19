"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateToken, hashToken } from "@/lib/sms/token";
import { DEFAULT_RULES } from "@/lib/sms/categorize";

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

/** Enable the feature: create/refresh the token, seed default rules. Returns the token once. */
export async function enableSms(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUserId();
  const token = generateToken();

  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    sms_enabled: true,
    ingest_token_hash: hashToken(token),
  });
  if (error) return { ok: false, error: error.message };

  await seedDefaultRules(supabase, userId);
  refresh();
  return { ok: true, token };
}

export async function regenToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUserId();
  const token = generateToken();
  const { error } = await supabase
    .from("profiles")
    .update({ ingest_token_hash: hashToken(token) })
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, token };
}

export async function setSmsEnabled(enabled: boolean): Promise<Result> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("profiles").upsert({ user_id: userId, sms_enabled: enabled });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setAutoInsert(auto: boolean): Promise<Result> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("profiles").upsert({ user_id: userId, auto_insert: auto });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- Rules ----------
const ruleSchema = z.object({
  pattern: z.string().trim().min(2, "Pattern too short").max(60),
  category_id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
});

export async function saveRule(input: z.input<typeof ruleSchema>): Promise<Result> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("sms_rules").upsert(
    {
      user_id: userId,
      pattern: parsed.data.pattern.toLowerCase(),
      category_id: parsed.data.category_id,
      account_id: parsed.data.account_id ?? null,
      learned: false,
    },
    { onConflict: "user_id,pattern" },
  );
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteRule(id: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("sms_rules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- Review queue ----------
const confirmSchema = z.object({
  category_id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive(),
  note: z.string().max(200).optional().default(""),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["income", "expense"]),
});

/** Confirm a pending inbox item → insert the transaction, learn the merchant→category. */
export async function confirmPending(inboxId: string, input: z.input<typeof confirmSchema>): Promise<Result> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const d = parsed.data;

  const { data: txn, error: txnErr } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      occurred_on: d.occurred_on,
      type: d.type,
      amount: d.amount,
      category_id: d.category_id,
      account_id: d.account_id ?? null,
      note: d.note,
      source: "sms",
    })
    .select("id")
    .single();
  if (txnErr || !txn) return { ok: false, error: txnErr?.message ?? "Insert failed" };

  await supabase.from("sms_inbox").update({ status: "posted", transaction_id: txn.id }).eq("id", inboxId);

  // Learn: remember this merchant → category for next time.
  if (d.note.trim()) {
    await supabase.from("sms_rules").upsert(
      { user_id: userId, pattern: d.note.trim().toLowerCase(), category_id: d.category_id, learned: true },
      { onConflict: "user_id,pattern" },
    );
  }
  refresh();
  return { ok: true };
}

export async function ignorePending(inboxId: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("sms_inbox").update({ status: "ignored" }).eq("id", inboxId);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- helpers ----------
async function seedDefaultRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: cats } = await supabase.from("categories").select("id, name").eq("user_id", userId);
  const byName = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const rows = DEFAULT_RULES.map((r) => {
    const category_id = byName.get(r.category.toLowerCase());
    return category_id ? { user_id: userId, pattern: r.pattern, category_id, learned: false } : null;
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length) {
    await supabase.from("sms_rules").upsert(rows, { onConflict: "user_id,pattern", ignoreDuplicates: true });
  }
}
