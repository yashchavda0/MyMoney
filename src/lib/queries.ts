import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  Category,
  TransactionWithRefs,
  TxnType,
} from "@/lib/supabase/types";

const REFS = "*, category:categories(id,name,color,icon,fields), account:accounts(id,name,type)";

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getAccounts(includeArchived = false): Promise<Account[]> {
  const supabase = await createClient();
  let q = supabase.from("accounts").select("*").order("sort_order").order("name");
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return data ?? [];
}

export async function getCategories(includeArchived = false): Promise<Category[]> {
  const supabase = await createClient();
  let q = supabase.from("categories").select("*").order("kind").order("name");
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  return data ?? [];
}

export interface TxnFilter {
  start?: string;
  end?: string;
  accountId?: string;
  categoryId?: string;
  type?: TxnType;
  bookmarked?: boolean;
  search?: string;
  limit?: number;
}

export async function getTransactions(filter: TxnFilter = {}): Promise<TransactionWithRefs[]> {
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select(REFS)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filter.start) q = q.gte("occurred_on", filter.start);
  if (filter.end) q = q.lte("occurred_on", filter.end);
  if (filter.accountId) q = q.eq("account_id", filter.accountId);
  if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
  if (filter.type) q = q.eq("type", filter.type);
  if (filter.bookmarked) q = q.eq("is_bookmarked", true);
  if (filter.search) q = q.or(`note.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
  if (filter.limit) q = q.limit(filter.limit);

  const { data } = await q;
  return (data as unknown as TransactionWithRefs[]) ?? [];
}

export async function getBookmarks(): Promise<TransactionWithRefs[]> {
  return getTransactions({ bookmarked: true, limit: 50 });
}

/** Current balance per account: opening_balance + income − expense. */
export async function getAccountBalances() {
  const supabase = await createClient();
  const [accounts, txns] = await Promise.all([
    getAccounts(),
    supabase.from("transactions").select("account_id,type,amount"),
  ]);
  const rows = (txns.data ?? []) as { account_id: string | null; type: TxnType; amount: number }[];
  return accounts.map((a) => {
    const delta = rows
      .filter((t) => t.account_id === a.id)
      .reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    return { account: a, balance: a.opening_balance + delta };
  });
}
