"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

// ---------- Accounts ----------
const accountSchema = z.object({
  name: z.string().min(1, "Name required").max(60),
  type: z.enum(["bank", "credit_card", "debit_card", "cash", "wallet", "other"]),
  opening_balance: z.coerce.number().default(0),
  usable_for: z.enum(["income", "expense", "both"]).default("both"),
});

export async function upsertAccount(id: string | null, input: z.input<typeof accountSchema>): Promise<Result> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const error = id
    ? (await supabase.from("accounts").update(parsed.data).eq("id", id)).error
    : (await supabase.from("accounts").insert({ ...parsed.data, user_id: userId })).error;
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function archiveAccount(id: string, archived: boolean): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("accounts").update({ archived }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ---------- Categories ----------
const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, "Field label required").max(60),
  type: z.enum(["text", "number", "date", "select"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name required").max(60),
  kind: z.enum(["income", "expense", "both"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").default("#6366f1"),
  fields: z.array(fieldSchema).max(20).optional().default([]),
});

export async function upsertCategory(id: string | null, input: z.input<typeof categorySchema>): Promise<Result> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUserId();
  const error = id
    ? (await supabase.from("categories").update(parsed.data).eq("id", id)).error
    : (await supabase.from("categories").insert({ ...parsed.data, user_id: userId })).error;
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function archiveCategory(id: string, archived: boolean): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("categories").update({ archived }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Quick create-on-the-fly from the transaction form; returns the new id. */
export async function quickCreateCategory(name: string, kind: "income" | "expense"): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: name.trim(), kind })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, id: data.id };
}
