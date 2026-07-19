import { redirect } from "next/navigation";

// The daily view now lives at the dashboard root. Preserve old links.
export default function DailyRedirect() {
  redirect("/");
}
