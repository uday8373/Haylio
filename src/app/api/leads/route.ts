import { NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { buildLeads } from "@/lib/leads";

/** Dashboard: list all leads (derived from interactions). */
export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const leads = await buildLeads(biz.id);
  return NextResponse.json(leads);
}
