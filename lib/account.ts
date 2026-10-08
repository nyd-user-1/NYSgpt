import { AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, POOL_ID } from "@/lib/auth";

export type Account = { email: string; name: string; createdAt: Date | null };

/** The account behind an email, read from the pool for the reader's own pages. */
export async function readAccount(email: string): Promise<Account> {
  try {
    const r = await cognito.send(new AdminGetUserCommand({ UserPoolId: POOL_ID, Username: email }));
    const attr = (k: string) => r.UserAttributes?.find((a) => a.Name === k)?.Value ?? "";
    return { email, name: attr("name"), createdAt: r.UserCreateDate ?? null };
  } catch {
    return { email, name: "", createdAt: null };
  }
}
