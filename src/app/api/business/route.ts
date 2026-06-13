import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { updateBusiness } from "@/lib/store";

export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { passwordHash, ...safe } = biz;
  return NextResponse.json(safe);
}

export async function PATCH(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patch = await req.json().catch(() => null);
  if (!patch) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const updated = await updateBusiness(biz.id, patch);
  const { passwordHash, ...safe } = updated!;
  return NextResponse.json(safe);
}
