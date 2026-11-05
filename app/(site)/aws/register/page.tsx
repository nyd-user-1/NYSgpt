import HomePage from "@/app/(site)/(plate)/page";
import { PlateFrame } from "@/app/PlateFrame";
import { AccountShell, Section } from "@/components/AccountShell";
import { OpenAwsPanel } from "@/components/OpenAwsPanel";
import { currentUser } from "@/lib/auth";
import { entitlementOf, pending, planFor } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Where /aws/subscribe sends an AWS Marketplace buyer: the homepage, with the panel open on registration. */
export default async function AwsRegisterPage() {
  const p = await pending().catch(() => null);
  if (!p)
    return (
      <AccountShell title="AWS Marketplace">
        <Section title="Set up your account">
          <p className="m-0 text-[15px]">Open your subscription in AWS Marketplace and choose Set up your account.</p>
        </Section>
      </AccountShell>
    );

  const tier = await entitlementOf(p.product, p.license).catch(() => null);
  if (!tier)
    return (
      <AccountShell title="AWS Marketplace">
        <Section title="Confirming your subscription">
          <p className="m-0 text-[15px]">AWS has not confirmed the payment yet. Reload this page in a minute.</p>
        </Section>
      </AccountShell>
    );

  const user = await currentUser();
  return (
    <>
      <PlateFrame grid>
        <HomePage />
      </PlateFrame>
      <OpenAwsPanel view={{ kind: "aws-register", plan: planFor(p.product, tier), signedIn: user?.email ?? null }} />
    </>
  );
}
