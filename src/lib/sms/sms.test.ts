import { describe, it, expect } from "vitest";
import { parseSms } from "./parse";
import { fingerprint } from "./fingerprint";
import { resolveCategory } from "./categorize";
import { resolveAccount } from "./resolve-account";

describe("parseSms", () => {
  it("HDFC 'Sent' UPI debit", () => {
    const p = parseSms("Sent Rs.500.00 From HDFC Bank A/C x1234 To AMAZON On 18-07-26 Ref 123456789. Not You? Call.");
    expect(p.ok).toBe(true);
    expect(p.amount).toBe(500);
    expect(p.type).toBe("expense");
    expect(p.accountLast4).toBe("1234");
    expect(p.merchant).toBe("Amazon");
    expect(p.refId).toBe("123456789");
    expect(p.date).toBe("2026-07-18");
  });

  it("card 'spent' debit with thousands separator", () => {
    const p = parseSms("Rs.1,234.00 spent on HDFC Bank Card ending 5678 at SWIGGY on 2026-07-18. Avl bal Rs.5000");
    expect(p.amount).toBe(1234);
    expect(p.type).toBe("expense");
    expect(p.accountLast4).toBe("5678");
    expect(p.merchant).toBe("Swiggy");
    expect(p.date).toBe("2026-07-18");
  });

  it("SBI UPI VPA debit", () => {
    const p = parseSms("Dear Customer Rs.500 debited from A/c XX1234 on 18/07/26 to VPA merchant@okhdfc Ref No 987654 -SBI");
    expect(p.amount).toBe(500);
    expect(p.type).toBe("expense");
    expect(p.accountLast4).toBe("1234");
    expect(p.merchant).toBe("merchant@okhdfc");
    expect(p.refId).toBe("987654");
  });

  it("credit is income", () => {
    const p = parseSms("Rs.200 credited to A/c XX1234 on 18-07-26");
    expect(p.amount).toBe(200);
    expect(p.type).toBe("income");
  });

  it("non-transaction SMS parses as not-ok", () => {
    const p = parseSms("Your OTP is 123456. Do not share.");
    expect(p.ok).toBe(false);
    expect(p.amount).toBeNull();
  });
});

describe("fingerprint", () => {
  it("collapses the bank + card-network double (same amount/card/date, no ref)", () => {
    const bank = parseSms("Rs.500 debited from A/c XX1234 on 18-07-26 to STARBUCKS");
    const network = parseSms("Rs.500.00 spent on Card ending 1234 at STARBUCKS INDIA on 18-07-26");
    expect(fingerprint(bank)).toBe(fingerprint(network));
  });

  it("keeps two same-amount purchases apart when each carries a ref", () => {
    const a = parseSms("Rs.100 debited from A/c XX1234 on 18-07-26 Ref 111111");
    const b = parseSms("Rs.100 debited from A/c XX1234 on 18-07-26 Ref 222222");
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});

describe("resolveCategory", () => {
  const rules = [
    { pattern: "amazon", category_id: "cat-shop" },
    { pattern: "swiggy", category_id: "cat-food" },
  ];
  it("matches a known merchant", () => {
    expect(resolveCategory("Swiggy", "at swiggy", rules).category_id).toBe("cat-food");
  });
  it("returns null for an unknown merchant (→ Review)", () => {
    expect(resolveCategory("Unknown Shop", "at unknown shop", rules).category_id).toBeNull();
  });
  it("longest (most specific) pattern wins", () => {
    const r = [
      { pattern: "amazon", category_id: "cat-shop" },
      { pattern: "amazon pay", category_id: "cat-bills" },
    ];
    expect(resolveCategory("Amazon Pay", "amazon pay recharge", r).category_id).toBe("cat-bills");
  });
});

describe("resolveAccount", () => {
  const accounts = [
    { id: "acc-hdfc", name: "HDFC Bank", last4: "1234" },
    { id: "acc-cash", name: "Cash" },
  ];
  it("matches by tagged last-4", () => {
    expect(resolveAccount("1234", "some text", accounts)).toBe("acc-hdfc");
  });
  it("matches by account name word in text", () => {
    expect(resolveAccount(null, "Rs.500 spent via HDFC card", accounts)).toBe("acc-hdfc");
  });
  it("returns null when nothing matches", () => {
    expect(resolveAccount("9999", "Rs.500 at shop", accounts)).toBeNull();
  });
});
