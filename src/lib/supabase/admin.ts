import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client that bypasses RLS. Only usable server-side where
 * SUPABASE_SERVICE_ROLE_KEY is set (never expose this key to the browser).
 * Returns null when the key is absent.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createSbClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
