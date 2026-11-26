import { redirect } from "next/navigation";
import { currentBusiness } from "@/lib/session";
import { countUnreadConversations } from "@/lib/store";
import TopNav from "@/components/dashboard/TopNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const biz = await currentBusiness();
  if (!biz) redirect("/login");
  const unread = await countUnreadConversations(biz.id);

  return (
    <div className="light min-h-screen bg-[#a9b0bb] md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto bg-[#f1f1ee] md:rounded-[2rem] shadow-2xl min-h-screen md:min-h-[calc(100vh-4rem)] pb-8 overflow-x-clip">
        <TopNav businessName={biz.name} logoUrl={biz.logoUrl || undefined} unread={unread} />
        <main className="px-4 md:px-7 pt-5 animate-fade-up min-w-0">{children}</main>
      </div>
    </div>
  );
}
