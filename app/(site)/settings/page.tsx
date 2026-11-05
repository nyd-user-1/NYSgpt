import { redirect } from "next/navigation";
import { AccountShell, Section } from "@/components/AccountShell";
import { AppearanceForm } from "@/components/AccountForms";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Settings() {
  if (!(await currentUser())) redirect("/signin?next=/settings");
  return (
    <AccountShell title="Settings">
      <Section title="Appearance">
        <AppearanceForm />
      </Section>
    </AccountShell>
  );
}
