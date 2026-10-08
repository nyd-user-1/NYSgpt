import { redirect } from "next/navigation";
import { AccountShell, Section } from "@/components/AccountShell";
import { DeleteForm, PasswordForm } from "@/components/AccountForms";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Account() {
  if (!(await currentUser())) redirect("/signin?next=/account");
  return (
    <AccountShell title="Account">
      <Section title="Password">
        <PasswordForm />
      </Section>
      <Section title="Delete account">
        <DeleteForm />
      </Section>
    </AccountShell>
  );
}
