import { BareHeader } from "@/components/BareHeader";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SignInForm } from "../signin/SignInForm";

export const dynamic = "force-dynamic";

const SERIF = { fontFamily: "var(--font-display), Georgia, serif" } as const;

/** Only a local path may be the place to return to, never another site. */
const safeNext = (next: string | undefined) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/welcome");

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-6">
      <BareHeader />
      <div className="w-full max-w-sm">
        <h1 className="m-0 mb-8 text-center text-4xl font-normal" style={SERIF}>Create an account</h1>
        <SignInForm mode="signup" next={next} />
      </div>
    </main>
  );
}
