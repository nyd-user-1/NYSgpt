import { redirect } from "next/navigation";
import { AccountShell } from "@/components/AccountShell";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Nothing on the site sends notifications yet; the page says so. */
export default async function Notifications() {
  if (!(await currentUser())) redirect("/signin?next=/notifications");
  return (
    <AccountShell title="Notifications">
      <p className="m-0 border-t border-[var(--paper-rule-soft)] pt-8 text-[15px] text-[var(--paper-muted)]">No notifications yet.</p>
    </AccountShell>
  );
}
