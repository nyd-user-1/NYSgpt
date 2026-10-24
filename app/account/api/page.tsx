import { redirect } from "next/navigation";
import HomePage from "@/app/page";
import { AccountShell, Section } from "@/components/AccountShell";
import { OpenAwsPanel } from "@/components/OpenAwsPanel";
import { currentUser } from "@/lib/auth";
import { subscriptionsOf } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** An AWS Marketplace buyer's console: the homepage, with the panel open on their subscription. */
export default async function ApiConsolePage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/account/api");

  const [sub] = await subscriptionsOf(user.email);
  if (!sub)
    return (
      <AccountShell title="API">
        <Section title="AWS Marketplace">
          <p className="m-0 text-[15px]">No AWS Marketplace subscription is registered to {user.email}.</p>
        </Section>
      </AccountShell>
    );

  return (
    <>
      <HomePage />
      <OpenAwsPanel view={{ kind: "aws-console", sub }} />
    </>
  );
}
