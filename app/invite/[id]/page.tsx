import { BareHeader } from "@/components/BareHeader";
import Link from "next/link";
import { readInvite, usable } from "@/lib/invites";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

/** An invite link. Opening it only reads the invite; the form is what spends it. */
export default async function Invite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const open = usable(await readInvite(id));
  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-6">
      <BareHeader />
      <div className="w-full max-w-sm">
        {open ? (
          <>
            <h1 className="m-0 mb-2 text-center text-4xl font-normal" style={SERIF}>Welcome</h1>
            <p className="m-0 mb-8 text-center text-muted-foreground">Choose the email and password for this invitation.</p>
            <InviteForm id={id} />
          </>
        ) : (
          <div className="text-center">
            <h1 className="m-0 mb-3 text-4xl font-normal" style={SERIF}>This invite has been used</h1>
            <p className="m-0 mb-6 text-muted-foreground">Or it has expired. An account made with it signs in as usual.</p>
            <Link href="/signin" className="text-sm font-medium underline underline-offset-4">Sign in</Link>
          </div>
        )}
      </div>
    </main>
  );
}
