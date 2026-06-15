import Link from "next/link";
import SmsStatusBadges from "@/components/dashboard/SmsStatusBadges";
import EnquiryRangeView from "@/components/dashboard/EnquiryRangeView";
import type { SmsVerificationStatus } from "@/lib/types";
import { ChevronRightIcon, PhoneIcon } from "@/components/icons";

export default function EnquiryTracker({
  phoneNumber,
  verificationStatus,
  timestamps,
}: {
  phoneNumber: string | null;
  verificationStatus: SmsVerificationStatus;
  timestamps: number[];
}) {
  const phoneBlock = (
    <>
      <Link href="/dashboard/calls" className="group flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#21201a] text-white flex items-center justify-center shrink-0">
          <PhoneIcon size={16} />
        </span>
        {phoneNumber ? (
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-wide text-[#8a897f] uppercase">
              Your toll-free number
            </span>
            <span className="flex items-center gap-2 text-2xl md:text-3xl font-semibold tracking-tight font-mono group-hover:text-[#e8552f] transition">
              {phoneNumber}
              <ChevronRightIcon size={20} className="text-[#c9c9c3] group-hover:text-[#e8552f] group-hover:translate-x-1 transition" />
            </span>
          </span>
        ) : (
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-wide text-[#8a897f] uppercase">
              Privacy Wrapper
            </span>
            <span className="flex items-center gap-2 text-2xl md:text-3xl font-semibold tracking-tight text-[#e8552f]">
              Get your toll-free number
              <ChevronRightIcon size={20} className="group-hover:translate-x-1 transition" />
            </span>
          </span>
        )}
      </Link>
      {phoneNumber && <SmsStatusBadges status={verificationStatus} className="mt-3" />}
      <p className="mt-3 text-xs text-[#8a897f] max-w-xs leading-relaxed">
        {phoneNumber
          ? "Put it on Google instead of your mobile — every call, SMS and click is tracked in the Calls tab."
          : "Replace your mobile number on Google with a number that greets callers and texts them your link."}
      </p>
    </>
  );

  return (
    <section className="card md:col-span-7 p-5 md:p-7 relative min-w-0">
      <EnquiryRangeView timestamps={timestamps} left={phoneBlock} expandHref="/dashboard/enquiries" />
    </section>
  );
}
