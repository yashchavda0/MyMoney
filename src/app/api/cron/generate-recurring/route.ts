import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRecurringForUser } from "@/lib/recurring/run";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Daily cron entry point. Materializes due recurring transactions for every user.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 * Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS across users; without it this
 * is a no-op, since the in-app catch-up already covers the signed-in user.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, skipped: "no service role key; in-app catch-up handles generation" });
  }

  const today = todayISO();
  const { data: rows } = await admin
    .from("recurring_rules")
    .select("user_id")
    .eq("active", true)
    .lte("next_run_on", today);

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  let created = 0;
  for (const userId of userIds) {
    const res = await runRecurringForUser(admin, userId, today);
    created += res.created;
  }

  return NextResponse.json({ ok: true, users: userIds.length, created });
}
