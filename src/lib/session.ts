import { cookies } from "next/headers";
import { getSessionActor, getSessionBusiness, type SessionActor } from "./store";
import type { Business } from "./types";

export const SESSION_COOKIE = "haylio_session";

export async function currentBusiness(): Promise<Business | undefined> {
  const jar = await cookies();
  return getSessionBusiness(jar.get(SESSION_COOKIE)?.value);
}

/** The acting user for the current session: their business, role and identity. */
export async function currentActor(): Promise<SessionActor | undefined> {
  const jar = await cookies();
  return getSessionActor(jar.get(SESSION_COOKIE)?.value);
}
