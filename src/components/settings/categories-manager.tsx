"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, Loader2, X } from "lucide-react";
import type { Category, CategoryKind, CategoryField, FieldType } from "@/lib/supabase/types";
import {
  upsertCategory,
  archiveCategory,
  deleteCategory,
} from "@/app/actions/settings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "both", label: "Both" },
];

const SECTIONS: { kind: CategoryKind; label: string }[] = [
  { kind: "income", label: "Income" },
  { kind: "expense", label: "Expense" },
  { kind: "both", label: "Both" },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
];

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [open, setOpen] = React.useState(false);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setOpen(true);
  }

  async function onArchive(c: Category) {
    await archiveCategory(c.id, !c.archived);
    router.refresh();
  }
  async function onDelete(c: Category) {
    if (!window.confirm(`Delete category "${c.name}"? Its transactions will remain but lose this category.`)) return;
    await deleteCategory(c.id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No categories yet.</p>
        )}
        {SECTIONS.map(({ kind, label }) => {
          const rows = categories.filter((c) => c.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <div className="space-y-0.5">
                {rows.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50",
                      c.archived && "opacity-50",
                    )}
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                    {c.fields.length > 0 && (
                      <Badge className="text-muted-foreground">
                        {c.fields.length} field{c.fields.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {c.archived && <Badge className="text-muted-foreground">Archived</Badge>}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                      <IconBtn label="Edit" onClick={() => openEdit(c)}>
                        <Pencil className="size-3.5" />
                      </IconBtn>
                      <IconBtn label={c.archived ? "Unarchive" : "Archive"} onClick={() => onArchive(c)}>
                        {c.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                      </IconBtn>
                      <IconBtn label="Delete" onClick={() => onDelete(c)} danger>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>

      <CategoryModal
        open={open}
        onClose={() => setOpen(false)}
        category={editing}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </Card>
  );
}

function CategoryModal({
  open,
  onClose,
  category,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<CategoryKind>("expense");
  const [color, setColor] = React.useState("#6366f1");
  const [fields, setFields] = React.useState<CategoryField[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setKind(category?.kind ?? "expense");
      setColor(category?.color ?? "#6366f1");
      setFields(category?.fields ?? []);
      setError("");
    }
  }, [open, category]);

  function addField() {
    setFields((f) => [...f, { id: crypto.randomUUID(), label: "", type: "text" }]);
  }
  function updateField(id: string, patch: Partial<CategoryField>) {
    setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeField(id: string) {
    setFields((f) => f.filter((x) => x.id !== id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    // Drop unlabeled fields; trim select options.
    const cleanFields = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        ...f,
        label: f.label.trim(),
        options: f.type === "select" ? (f.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      }));
    const res = await upsertCategory(category?.id ?? null, {
      name: name.trim(),
      kind,
      color,
      fields: cleanFields,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={category ? "Edit category" : "Add category"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Name</Label>
          <Input id="cat-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-kind">Kind</Label>
            <Select id="cat-kind" value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)}>
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-color">Color</Label>
            <div className="flex h-9 items-center gap-2">
              <input
                id="cat-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
              />
              <span className="tabular text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Custom fields</Label>
              <p className="text-xs text-muted-foreground">Extra details prompted when this category is picked.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="size-3.5" /> Field
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No fields. e.g. Salary → Employer, Month · Rent → Property.
            </p>
          )}

          {fields.map((f) => (
            <div key={f.id} className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Field label (e.g. Employer)"
                  value={f.label}
                  onChange={(e) => updateField(f.id, { label: e.target.value })}
                  className="h-8"
                />
                <Select
                  value={f.type}
                  onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                  className="h-8 w-32"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={() => removeField(f.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
              {f.type === "select" && (
                <Input
                  placeholder="Options, comma-separated (e.g. Gross, Net)"
                  value={(f.options ?? []).join(", ")}
                  onChange={(e) => updateField(f.id, { options: e.target.value.split(",").map((s) => s.trimStart()) })}
                  className="h-8"
                />
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => updateField(f.id, { required: e.target.checked })}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Required
              </label>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {category ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
