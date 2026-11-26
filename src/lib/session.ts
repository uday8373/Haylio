import { cache } from "react";
import { cookies } from "next/headers";
import { getSessionActor, type SessionActor } from "./store";
import type { Business } from "./types";

export const SESSION_COOKIE = "haylio_session";

/**
 * The acting user for the current session: their business, role and identity.
 * Wrapped in React `cache` so the layout and the page share one lookup per
 * request instead of each hitting the database.
 */
export const currentActor = cache(async (): Promise<SessionActor | undefined> => {
  const jar = await cookies();
  return getSessionActor(jar.get(SESSION_COOKIE)?.value);
});

export async function currentBusiness(): Promise<Business | undefined> {
  return (await currentActor())?.business;
}
