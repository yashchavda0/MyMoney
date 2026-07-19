"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Account, Category } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function TransactionsFilterBar({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = React.useState(params.get("q") ?? "");

  const set = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  // Debounced search.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== search) set("q", search);
    }, 350);
    return () => clearTimeout(id);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = ["q", "type", "account", "category", "start", "end", "bookmarked"].some((k) =>
    params.get(k),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[10rem] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search note or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)} className="w-auto min-w-[7rem]">
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </Select>

      <Select value={params.get("account") ?? ""} onChange={(e) => set("account", e.target.value)} className="w-auto min-w-[8rem]">
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>

      <Select value={params.get("category") ?? ""} onChange={(e) => set("category", e.target.value)} className="w-auto min-w-[8rem]">
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Input
        type="date"
        aria-label="From date"
        value={params.get("start") ?? ""}
        onChange={(e) => set("start", e.target.value)}
        className="w-auto"
      />
      <Input
        type="date"
        aria-label="To date"
        value={params.get("end") ?? ""}
        onChange={(e) => set("end", e.target.value)}
        className="w-auto"
      />

      <Button
        variant={params.get("bookmarked") ? "default" : "outline"}
        size="sm"
        onClick={() => set("bookmarked", params.get("bookmarked") ? "" : "1")}
      >
        ★ Bookmarked
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="size-4" /> Clear
        </Button>
      )}
    </div>
  );
}
