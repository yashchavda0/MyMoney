"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const txnSchema = z.object({
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().nonnegative("Amount must be ≥ 0"),
  category_id: z.string().uuid().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  note: z.string().max(200).optional().default(""),
  description: z.string().max(2000).nullable().optional(),
  is_bookmarked: z.boolean().optional().default(false),
  details: z.record(z.string(), z.string()).optional().default({}),
});

export type TxnInput = z.input<typeof txnSchema>;
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

export async function createTransaction(input: TxnInput): Promise<Result> {
  const parsed = txnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("transactions").insert({ ...parsed.data, user_id: userId });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function updateTransaction(id: string, input: TxnInput): Promise<Result> {
  const parsed = txnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("transactions").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function toggleBookmark(id: string, value: boolean): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("transactions").update({ is_bookmarked: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function bulkCreateTransactions(rows: TxnInput[]): Promise<Result & { count?: number }> {
  const parsed = z.array(txnSchema).safeParse(rows);
  if (!parsed.success) return { ok: false, error: `Row ${(parsed.error.issues[0].path[0] as number) + 1}: ${parsed.error.issues[0].message}` };
  if (parsed.data.length === 0) return { ok: false, error: "Nothing to import" };
  const { supabase, userId } = await requireUserId();
  const payload = parsed.data.map((r) => ({ ...r, user_id: userId }));
  const { error } = await supabase.from("transactions").insert(payload);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, count: payload.length };
}
