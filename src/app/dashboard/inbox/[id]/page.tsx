import Link from "next/link";
import { notFound } from "next/navigation";
import { currentBusiness } from "@/lib/session";
import { getConversation, markRead } from "@/lib/store";
import { channelMeta } from "@/lib/ui";
import { ChannelIcon } from "@/components/icons";
import ConversationThread from "@/components/dashboard/ConversationThread";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const biz = (await currentBusiness())!;
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv || conv.businessId !== biz.id) notFound();
  await markRead(id);

  const meta = channelMeta[conv.channel];

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/inbox" className="text-sm text-[#8a897f] hover:text-[#1b1a14] transition">
        ‹ Back to inbox
      </Link>
      <div className="mt-4 flex items-center gap-4">
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ background: conv.channel === "callback" ? "#e8552f" : conv.channel === "chat" ? "#7c97c9" : "#21201a" }}
        >
          <ChannelIcon channel={conv.channel} size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{conv.visitorName || "Visitor"}</h1>
          <p className="text-xs text-[#8a897f] mt-0.5">
            {meta.label}
            {conv.visitorContact && <> · {conv.visitorContact}</>}
          </p>
        </div>
      </div>
      <ConversationThread initial={JSON.parse(JSON.stringify(conv))} />
    </div>
  );
}
