import { cookies } from "next/headers";
import { getSessionBusiness } from "./store";
import type { Business } from "./types";

export const SESSION_COOKIE = "haylio_session";

export async function currentBusiness(): Promise<Business | undefined> {
  const jar = await cookies();
  return getSessionBusiness(jar.get(SESSION_COOKIE)?.value);
}
