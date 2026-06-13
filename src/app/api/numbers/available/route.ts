import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { searchTollFreeNumbers, twilioEnabled } from "@/lib/telephony";

/** Search available toll-free numbers to choose from. */
export async function GET(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const areaCodeRaw = (url.searchParams.get("areaCode") ?? "").replace(/\D/g, "").slice(0, 3);
  const containsRaw = (url.searchParams.get("contains") ?? "").replace(/[^0-9*]/g, "").slice(0, 10);

  try {
    const numbers = await searchTollFreeNumbers({
      areaCode: areaCodeRaw || undefined,
      contains: containsRaw || undefined,
      limit: 12,
    });
    return NextResponse.json({ numbers, live: twilioEnabled });
  } catch (err) {
    const detail = err instanceof Error ? err.message.match(/"message":"([^"]+)"/)?.[1] : undefined;
    return NextResponse.json(
      { error: detail ? `Twilio: ${detail}` : "Couldn't load numbers — try again." },
      { status: 502 }
    );
  }
}
