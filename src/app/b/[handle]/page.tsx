import { cookies } from "next/headers";
import { getBusinessByHandle, getConversation, getEngagementByToken, toPublic } from "@/lib/store";
import ContactWidget from "@/components/ContactWidget";
import Link from "next/link";
import { SearchIcon, ZapIcon } from "@/components/icons";

/** Resolve a resumable conversation for this visitor from their cookies. */
async function resolveResume(handle: string, businessId: string) {
  const jar = await cookies();

  // 1. Returning chat visitor — cookie holds "<conversationId>.<visitorKey>".
  const chatCookie = jar.get(`haylio_chat_${handle}`)?.value;
  if (chatCookie) {
    const [cid, vk] = chatCookie.split(".");
    const conv = cid ? await getConversation(cid) : undefined;
    if (conv && conv.businessId === businessId && conv.visitorKey === vk) {
      return { conversationId: conv.id, visitorKey: conv.visitorKey };
    }
  }

  // 2. Arrived via a post-call SMS link — resume the conversation tied to it.
  const engToken = jar.get("haylio_engagement")?.value;
  if (engToken) {
    const eng = await getEngagementByToken(engToken);
    if (eng && eng.businessId === businessId && eng.conversationId) {
      const conv = await getConversation(eng.conversationId);
      if (conv) return { conversationId: conv.id, visitorKey: conv.visitorKey };
    }
  }
  return undefined;
}

export default async function PublicContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { handle } = await params;
  const { embed } = await searchParams;
  const biz = await getBusinessByHandle(handle);

  if (!biz) {
    return (
      <main className="light min-h-screen bg-[#a9b0bb] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[#4b4a42] animate-float"><SearchIcon size={44} /></p>
        <h1 className="text-2xl font-bold">This link doesn't exist</h1>
        <p className="text-[#55544c] text-sm">Check the address, or the business may have changed its link.</p>
        <Link href="/" className="btn-secondary mt-2 !rounded-full">Go to Haylio</Link>
      </main>
    );
  }

  const pub = toPublic(biz);
  const resume = await resolveResume(handle, biz.id);

  if (embed) {
    return (
      <main className="light min-h-screen flex items-start justify-center p-2">
        <ContactWidget business={pub} resume={resume} />
      </main>
    );
  }

  return (
    <main className="light relative min-h-screen flex flex-col items-center px-4 py-8 md:py-12 overflow-hidden bg-[#a9b0bb]">
      {pub.backgroundImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pub.backgroundImageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1b1a14]/40 backdrop-blur-[2px]" />
        </>
      )}
      <div className="relative w-full flex justify-center animate-scale-in">
        <ContactWidget business={pub} resume={resume} />
      </div>
      <p className="relative mt-7 text-xs text-white/80 flex items-center gap-1.5">
        Powered by{" "}
        <Link href="/" className="font-semibold text-white hover:opacity-80 transition inline-flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-[#e8552f] text-white inline-flex items-center justify-center"><ZapIcon size={9} /></span>
          Haylio
        </Link>{" "}
        — private contact links for businesses
      </p>
    </main>
  );
}
