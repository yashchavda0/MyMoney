import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { getAccounts, getCategories } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { AccountsManager } from "@/components/settings/accounts-manager";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { AppearanceControls } from "@/components/appearance-controls";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const [accounts, categories] = await Promise.all([
    getAccounts(true),
    getCategories(true),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Manage your accounts, categories and appearance" />

      <Link href="/settings/auto-import">
        <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <Zap className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Auto-import from SMS</span>
            <span className="block text-xs text-muted-foreground">Bank messages → transactions, hands-free on iPhone</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Card>
      </Link>

      <AppearanceControls />
      <div className="grid gap-4 lg:grid-cols-2">
        <AccountsManager accounts={accounts} />
        <CategoriesManager categories={categories} />
      </div>
    </div>
  );
}
