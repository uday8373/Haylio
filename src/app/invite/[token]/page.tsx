import Link from "next/link";
import { getTeamMemberByToken, getBusiness } from "@/lib/store";
import { ZapIcon } from "@/components/icons";
import InviteAccept from "@/components/InviteAccept";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await getTeamMemberByToken(token);
  const business = member ? await getBusiness(member.businessId) : undefined;

  return (
    <main className="light min-h-screen bg-[#a9b0bb] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md p-9 animate-scale-in !rounded-[2rem]">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#e8552f] text-white flex items-center justify-center"><ZapIcon size={16} /></span>
          <span className="font-bold tracking-wide text-sm uppercase">Haylio</span>
        </Link>

        {!member || !business ? (
          <>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight">Invitation not found</h1>
            <p className="text-sm text-[#8a897f] mt-2">
              This invite link is invalid or has expired. Ask the admin to send you a fresh invitation.
            </p>
            <Link href="/login" className="btn-secondary mt-7 w-full justify-center !rounded-full">Go to login</Link>
          </>
        ) : member.status === "active" ? (
          <>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight">You're already in</h1>
            <p className="text-sm text-[#8a897f] mt-2">
              You've already accepted your invitation to <span className="font-semibold text-[#1b1a14]">{business.name}</span>.
              Log in with <span className="font-semibold text-[#1b1a14]">{member.email}</span> to continue.
            </p>
            <Link href={`/login?email=${encodeURIComponent(member.email)}`} className="btn-primary mt-7 w-full justify-center !rounded-full">
              Log in
            </Link>
          </>
        ) : (
          <InviteAccept
            token={token}
            email={member.email}
            role={member.role}
            businessName={business.name}
          />
        )}
      </div>
    </main>
  );
}
