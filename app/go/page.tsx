import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isProductUrl } from "@/lib/gate";

export const dynamic = "force-dynamic";

/**
 * The gate in front of a product site: signed out, to the sign-in (and from
 * there the welcome screen and the homepage, where the products wake);
 * signed in, straight on to the product.
 */
export default async function Go({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const to = (await searchParams).to ?? "";
  if (!isProductUrl(to)) redirect("/");
  if (!(await currentUser())) redirect("/signin");
  redirect(to);
}
