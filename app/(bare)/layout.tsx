import { BareHeader } from "@/components/BareHeader";

// The sign-in flow's pages — sign in, sign up, invite, welcome — under one fixed header that stays mounted
// from one step to the next (2026-11-04); each page used to render its own.
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BareHeader />
      {children}
    </>
  );
}
