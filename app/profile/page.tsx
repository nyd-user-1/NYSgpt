import { redirect } from "next/navigation";
import { AccountShell, Section } from "@/components/AccountShell";
import { NameForm } from "@/components/AccountForms";
import { readAccount } from "@/lib/account";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function Profile() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/profile");
  const account = await readAccount(user.email);
  return (
    <AccountShell title="Profile">
      <Section title="Name">
        <NameForm initial={account.name} />
      </Section>
      <Section title="Email">
        <p className="m-0 text-[15px]">{account.email}</p>
      </Section>
      {account.createdAt && (
        <Section title="Member since">
          <p className="m-0 text-[15px]">{DATE.format(account.createdAt)}</p>
        </Section>
      )}
    </AccountShell>
  );
}
