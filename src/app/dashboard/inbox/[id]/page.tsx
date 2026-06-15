import Link from "next/link";
import { notFound } from "next/navigation";
import { currentBusiness } from "@/lib/session";
import { getConversation, markRead } from "@/lib/store";
import { channelMeta } from "@/lib/ui";
import { ChannelIcon } from "@/components/icons";
import ConversationThread from "@/components/dashboard/ConversationThread";
import VisitorMetaCard from "@/components/dashboard/VisitorMetaCard";
import ConversationMeta from "@/components/dashboard/ConversationMeta";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const biz = (await currentBusiness())!;
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv || conv.businessId !== biz.id) notFound();
  await markRead(id);

  const meta = channelMeta[conv.channel];

  return (
    <div>
      <Link href="/dashboard/inbox" className="text-sm text-[#8a897f] hover:text-[#1b1a14] transition">
        ‹ Back to inbox
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <span
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{ background: conv.channel === "callback" ? "#e8552f" : conv.channel === "chat" ? "#7c97c9" : "#21201a" }}
        >
          <ChannelIcon channel={conv.channel} size={20} />
        </span>
        <ConversationMeta
          conversationId={conv.id}
          channelLabel={meta.label}
          contact={conv.visitorContact}
          initialName={conv.visitorName || "Visitor"}
          initialTag={conv.tag ?? "none"}
        />
      </div>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="max-w-2xl min-w-0">
          <ConversationThread initial={JSON.parse(JSON.stringify(conv))} />
        </div>
        {conv.visitorMeta && (
          <aside className="lg:sticky lg:top-6">
            <VisitorMetaCard meta={conv.visitorMeta} />
          </aside>
        )}
      </div>
    </div>
  );
}
