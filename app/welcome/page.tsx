import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Welcome } from "./Welcome";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  if (!(await currentUser())) redirect("/signin");
  return <Welcome />;
}
