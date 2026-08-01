"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Account, Category } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const ADVANCED_KEYS = ["type", "account", "category", "start", "end", "bookmarked"];

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
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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

  const activeCount = ADVANCED_KEYS.filter((k) => params.get(k)).length;

  function clearAdvanced() {
    const next = new URLSearchParams(params.toString());
    ADVANCED_KEYS.forEach((k) => next.delete(k));
    router.push(`${pathname}?${next.toString()}`);
    setFiltersOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search note or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          size="icon"
          aria-label="Filters"
          className="relative shrink-0"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-3">
          <Select value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>

          <Select value={params.get("account") ?? ""} onChange={(e) => set("account", e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          <Select value={params.get("category") ?? ""} onChange={(e) => set("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={params.get("start") ?? ""}
              onChange={(e) => set("start", e.target.value)}
            />
            <Input
              type="date"
              aria-label="To date"
              value={params.get("end") ?? ""}
              onChange={(e) => set("end", e.target.value)}
            />
          </div>

          <Button
            variant={params.get("bookmarked") ? "default" : "outline"}
            className="w-full"
            onClick={() => set("bookmarked", params.get("bookmarked") ? "" : "1")}
          >
            ★ Bookmarked only
          </Button>

          {activeCount > 0 && (
            <Button variant="ghost" className="w-full" onClick={clearAdvanced}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
