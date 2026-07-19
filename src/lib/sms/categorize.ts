export interface RuleLike {
  pattern: string; // lowercased merchant keyword / substring
  category_id: string | null;
  account_id?: string | null;
}

/** Default keyword → category-NAME map, seeded into sms_rules per user on enable. */
export const DEFAULT_RULES: { pattern: string; category: string }[] = [
  { pattern: "swiggy", category: "Food" },
  { pattern: "zomato", category: "Food" },
  { pattern: "dominos", category: "Food" },
  { pattern: "starbucks", category: "Food" },
  { pattern: "amazon", category: "Shopping" },
  { pattern: "flipkart", category: "Shopping" },
  { pattern: "myntra", category: "Shopping" },
  { pattern: "uber", category: "Transport" },
  { pattern: "ola", category: "Transport" },
  { pattern: "irctc", category: "Transport" },
  { pattern: "petrol", category: "Transport" },
  { pattern: "hpcl", category: "Transport" },
  { pattern: "iocl", category: "Transport" },
  { pattern: "recharge", category: "Bills" },
  { pattern: "electricity", category: "Bills" },
  { pattern: "airtel", category: "Bills" },
  { pattern: "jio", category: "Bills" },
  { pattern: "atm", category: "Cash" },
  { pattern: "salary", category: "Salary" },
];

/**
 * Resolve a category (and optional account) for a parsed SMS by matching its
 * merchant/text against the user's rules. Most specific (longest) pattern wins.
 * Returns category_id = null when nothing matches → caller holds it for Review.
 */
export function resolveCategory(
  merchant: string | null,
  text: string,
  rules: RuleLike[],
): { category_id: string | null; account_id: string | null } {
  const hay = `${(merchant ?? "").toLowerCase()} ${text.toLowerCase()}`;
  let best: RuleLike | null = null;
  for (const r of rules) {
    const p = r.pattern.trim().toLowerCase();
    if (p && hay.includes(p) && (!best || p.length > best.pattern.length)) {
      best = { ...r, pattern: p };
    }
  }
  return { category_id: best?.category_id ?? null, account_id: best?.account_id ?? null };
}
