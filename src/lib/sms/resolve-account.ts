export interface AccountLike {
  id: string;
  name: string;
  last4?: string | null; // optional tag the user can set (e.g. "1234")
}

/**
 * Best-effort account match for a parsed SMS:
 * 1) by the last-4 digits the SMS mentions, if the user tagged an account with them;
 * 2) otherwise by an account name word appearing in the SMS text.
 * Returns null when nothing matches — account is optional on a transaction.
 */
export function resolveAccount(
  accountLast4: string | null,
  text: string,
  accounts: AccountLike[],
): string | null {
  if (accountLast4) {
    const byLast4 = accounts.find((a) => a.last4 && a.last4 === accountLast4);
    if (byLast4) return byLast4.id;
  }
  const lower = text.toLowerCase();
  const byName = accounts.find((a) =>
    a.name
      .toLowerCase()
      .split(/\s+/)
      .some((w) => w.length >= 3 && lower.includes(w)),
  );
  return byName?.id ?? null;
}
