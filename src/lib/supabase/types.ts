// Hand-maintained schema types (kept in sync with supabase/migrations).

export type AccountType =
  | "bank"
  | "credit_card"
  | "debit_card"
  | "cash"
  | "wallet"
  | "other";

export type CategoryKind = "income" | "expense" | "both";
export type TxnType = "income" | "expense";
export type AccountUsage = "income" | "expense" | "both";

export type FieldType = "text" | "number" | "date" | "select";

/** A user-defined custom field attached to a category. */
export type CategoryField = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // for type "select"
  required?: boolean;
};
export type Frequency =
  | "daily"
  | "weekday"
  | "weekend"
  | "weekly"
  | "monthly"
  | "yearly";

export type TxnSource = "manual" | "sms" | "import" | "recurring";
export type SmsStatus = "pending" | "posted" | "duplicate" | "ignored";

// NOTE: these are `type` aliases, not interfaces. supabase-js checks the schema
// against `Record<string, unknown>`, and interfaces (being augmentable) are not
// assignable to an index signature — using them collapses every row type to `never`.
export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  usable_for: AccountUsage;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string | null;
  parent_id: string | null;
  fields: CategoryField[];
  archived: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  occurred_on: string; // yyyy-MM-dd
  type: TxnType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string;
  description: string | null;
  is_bookmarked: boolean;
  details: Record<string, string>;
  recurring_rule_id: string | null;
  source: TxnSource;
  created_at: string;
  updated_at: string;
};

export type RecurringRule = {
  id: string;
  user_id: string;
  type: TxnType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string;
  description: string | null;
  frequency: Frequency;
  interval: number;
  weekdays: number[] | null; // 0=Sun .. 6=Sat
  day_of_month: number | null;
  start_date: string; // yyyy-MM-dd
  end_date: string | null;
  next_run_on: string; // yyyy-MM-dd
  active: boolean;
  created_at: string;
}

export type Profile = {
  user_id: string;
  sms_enabled: boolean;
  auto_insert: boolean;
  ingest_token_hash: string | null;
  created_at: string;
};

export type SmsRule = {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string | null;
  account_id: string | null;
  learned: boolean;
  created_at: string;
};

export type SmsInbox = {
  id: string;
  user_id: string;
  raw_text: string;
  sender: string | null;
  received_at: string;
  amount: number | null;
  type: TxnType | null;
  account_id: string | null;
  note: string | null;
  category_id: string | null;
  fingerprint: string;
  status: SmsStatus;
  transaction_id: string | null;
  created_at: string;
};

// A transaction joined with its category + account for display.
export interface TransactionWithRefs extends Transaction {
  category: Pick<Category, "id" | "name" | "color" | "icon" | "fields"> | null;
  account: Pick<Account, "id" | "name" | "type"> | null;
}

// An inbox item joined with its category + account for the Review UI.
export interface SmsInboxWithRefs extends SmsInbox {
  category: Pick<Category, "id" | "name" | "color"> | null;
  account: Pick<Account, "id" | "name"> | null;
}

// user_id stays required — every insert must set it to satisfy RLS.
type Insert<T, Opt extends keyof T> = Omit<T, "id" | "created_at" | Opt> &
  Partial<Pick<T, Opt>>;

export interface Database {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: Insert<Account, "archived" | "sort_order" | "opening_balance" | "usable_for">;
        Update: Partial<Account>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Insert<Category, "archived" | "icon" | "parent_id" | "color" | "fields">;
        Update: Partial<Category>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Insert<
          Transaction,
          | "description"
          | "is_bookmarked"
          | "recurring_rule_id"
          | "category_id"
          | "account_id"
          | "note"
          | "updated_at"
          | "details"
          | "source"
        >;
        Update: Partial<Transaction>;
        Relationships: [];
      };
      recurring_rules: {
        Row: RecurringRule;
        Insert: Insert<
          RecurringRule,
          | "interval"
          | "weekdays"
          | "day_of_month"
          | "end_date"
          | "active"
          | "description"
          | "category_id"
          | "account_id"
          | "note"
        >;
        Update: Partial<RecurringRule>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Insert<Profile, "sms_enabled" | "auto_insert" | "ingest_token_hash">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      sms_rules: {
        Row: SmsRule;
        Insert: Insert<SmsRule, "account_id" | "learned">;
        Update: Partial<SmsRule>;
        Relationships: [];
      };
      sms_inbox: {
        Row: SmsInbox;
        Insert: Insert<
          SmsInbox,
          | "sender"
          | "amount"
          | "type"
          | "account_id"
          | "note"
          | "category_id"
          | "status"
          | "transaction_id"
          | "received_at"
        >;
        Update: Partial<SmsInbox>;
        Relationships: [];
      };
    };
    // Empty mapped types (no string index signature) — a `Record<string, never>`
    // here would intersect with Tables and collapse every row type to `never`.
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      account_type: AccountType;
      category_kind: CategoryKind;
      txn_type: TxnType;
      frequency: Frequency;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
