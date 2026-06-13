import { NextRequest, NextResponse } from "next/server";
import { getBusiness, getEngagementByToken, updateEngagement } from "@/lib/store";

const VISITOR_COOKIE = "haylio_engagement";

/**
 * The tracked link from the post-call SMS.
 * Logs the click (call-to-click conversion), ties the browser session to the
 * caller via cookie, then redirects to the business's public contact page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const eng = await getEngagementByToken(token);
  if (!eng) return NextResponse.redirect(new URL("/", req.url));

  const biz = await getBusiness(eng.businessId);
  if (!biz) return NextResponse.redirect(new URL("/", req.url));

  if (!eng.clickedAt) {
    await updateEngagement(eng.id, { clickedAt: Date.now() });
  }

  const res = NextResponse.redirect(new URL(`/b/${biz.handle}?via=call`, req.url));
  res.cookies.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
