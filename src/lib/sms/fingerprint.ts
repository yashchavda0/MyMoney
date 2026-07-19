import type { ParsedSms } from "./parse";

/**
 * Stable dedup key for a parsed SMS. The bank SMS and the card-network SMS for the
 * same swipe share amount + card last-4 + date + direction, so the second is ignored
 * even when their merchant wording differs.
 *
 * A distinct bank reference id, when present, keys the row on its own — so two
 * genuine same-amount, same-day purchases (each with its own ref) stay separate.
 * Trade-off: two identical purchases with no ref on the same card/day collapse to
 * one; the user can still add the second manually.
 */
export function fingerprint(p: ParsedSms): string {
  if (p.refId) return `ref:${p.refId.toLowerCase()}`;
  return `${p.type}:${p.amount ?? "?"}:${p.accountLast4 ?? "?"}:${p.date}`;
}
