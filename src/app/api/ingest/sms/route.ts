import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSms } from "@/lib/sms/parse";
import { fingerprint } from "@/lib/sms/fingerprint";
import { resolveCategory, type RuleLike } from "@/lib/sms/categorize";
import { resolveAccount } from "@/lib/sms/resolve-account";
import { hashToken } from "@/lib/sms/token";
import { formatINR } from "@/lib/format";
import type { Account, SmsRule } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SMS ingestion webhook. The iOS Shortcut (or Android Tasker) POSTs:
 *   { "text": "<sms body>", "sender": "HDFCBK", "token": "<secret>" }
 * We resolve the user from the token hash, parse + dedupe + categorize, then
 * auto-insert the transaction — or hold it in the Review queue if the category
 * can't be resolved. Uses the service-role client (no user session here).
 */
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server not configured for ingestion" }, { status: 503 });
  }

  let body: { text?: string; sender?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const text = (body.text ?? "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  // Resolve the user from the token hash.
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, auto_insert, sms_enabled")
    .eq("ingest_token_hash", hashToken(token))
    .maybeSingle();

  if (!profile || !profile.sms_enabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = profile.user_id;

  const parsed = parseSms(text);
  if (!parsed.ok || parsed.amount === null) {
    return NextResponse.json({ status: "unparsed", message: "No amount found — not a transaction SMS." });
  }

  // Load the user's accounts + rules to resolve account/category.
  const [{ data: accountsData }, { data: rulesData }] = await Promise.all([
    admin.from("accounts").select("id, name").eq("user_id", userId).eq("archived", false),
    admin.from("sms_rules").select("pattern, category_id, account_id").eq("user_id", userId),
  ]);

  const accounts = (accountsData ?? []) as Pick<Account, "id" | "name">[];
  const rules = (rulesData ?? []) as RuleLike[];

  const { category_id: ruleCategory, account_id: ruleAccount } = resolveCategory(parsed.merchant, text, rules);
  const account_id = ruleAccount ?? resolveAccount(parsed.accountLast4, text, accounts);
  const category_id = ruleCategory;

  const fp = fingerprint(parsed);
  const willPost = profile.auto_insert && category_id !== null;

  // Insert into the inbox (dedupe on fingerprint). A conflict = we've seen this swipe.
  const { data: inboxRows } = await admin
    .from("sms_inbox")
    .upsert(
      {
        user_id: userId,
        raw_text: text,
        sender: body.sender ?? null,
        amount: parsed.amount,
        type: parsed.type,
        account_id,
        note: parsed.merchant,
        category_id,
        fingerprint: fp,
        status: willPost ? "posted" : "pending",
      },
      { onConflict: "user_id,fingerprint", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (!inboxRows) {
    return NextResponse.json({ status: "duplicate", message: "Already recorded — ignored." });
  }
  const inboxId = inboxRows.id;

  if (!willPost) {
    return NextResponse.json({
      status: "pending",
      message: `Saved for review · ${formatINR(parsed.amount)}${parsed.merchant ? " · " + parsed.merchant : ""}`,
    });
  }

  // Auto-insert the transaction and link it back to the inbox row.
  const { data: txn, error: txnErr } = await admin
    .from("transactions")
    .insert({
      user_id: userId,
      occurred_on: parsed.date,
      type: parsed.type,
      amount: parsed.amount,
      category_id,
      account_id,
      note: parsed.merchant ?? "",
      source: "sms",
    })
    .select("id")
    .single();

  if (txnErr || !txn) {
    // Fall back to pending so nothing is lost.
    await admin.from("sms_inbox").update({ status: "pending" }).eq("id", inboxId);
    return NextResponse.json({ status: "pending", message: "Saved for review (insert failed)." });
  }

  await admin.from("sms_inbox").update({ transaction_id: txn.id }).eq("id", inboxId);

  return NextResponse.json({
    status: "posted",
    message: `Added ${formatINR(parsed.amount)}${parsed.merchant ? " · " + parsed.merchant : ""}`,
  });
}
