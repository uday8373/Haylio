import Link from "next/link";
import type { SmsVerificationStatus } from "@/lib/types";

const SMS_META: Record<SmsVerificationStatus, { label: string; cls: string; dot: string }> = {
  not_submitted: {
    label: "SMS · Not verified",
    cls: "bg-[#fff4e5] border-[#f6dcb0] text-[#a96a16] hover:brightness-[0.97]",
    dot: "bg-[#d4912f]",
  },
  pending: {
    label: "SMS · Pending verification",
    cls: "bg-[#fff4e5] border-[#f6dcb0] text-[#a96a16] hover:brightness-[0.97]",
    dot: "bg-[#d4912f]",
  },
  verified: {
    label: "SMS · Live",
    cls: "bg-[#eaf3e6] border-[#cfe3c6] text-[#3e7d3a] hover:brightness-[0.97]",
    dot: "bg-[#3e7d3a]",
  },
  rejected: {
    label: "SMS · Action needed",
    cls: "bg-[#fdecea] border-[#f3c8c0] text-[#c0392b] hover:brightness-[0.97]",
    dot: "bg-[#c0392b]",
  },
};

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition";

/**
 * Two side-by-side channel badges for a toll-free number:
 *   • Voice — always Live once the number exists.
 *   • SMS   — reflects the toll-free verification status and links to the
 *             verification screen so the owner can finish/track it.
 */
export default function SmsStatusBadges({
  status,
  className = "",
}: {
  status: SmsVerificationStatus;
  className?: string;
}) {
  const sms = SMS_META[status];
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className={`${PILL} bg-[#eaf3e6] border-[#cfe3c6] text-[#3e7d3a]`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#3e7d3a]" /> Voice Live
      </span>
      <Link
        href="/dashboard/verification"
        className={`${PILL} ${sms.cls}`}
        title="Open SMS verification"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${sms.dot}`} /> {sms.label}
      </Link>
    </div>
  );
}
