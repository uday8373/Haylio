import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness } from "@/lib/store";
import { twilioEnabled } from "@/lib/telephony";
import { ChevronLeftIcon } from "@/components/icons";
import SmsVerificationCard from "@/components/dashboard/SmsVerificationCard";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const biz = (await currentBusiness())!;
  const number = await getNumberByBusiness(biz.id);

  // Pre-fill the sample message from the number's saved SMS template, resolving
  // {business} so the carrier sees a concrete example. {link} is left as-is.
  const sampleMessage = (number?.smsTemplate ?? "")
    .replace(/\{business\}/g, biz.name)
    .trim();

  // Pre-fill the use-case summary from Haylio's purpose: an opt-in, reply-only
  // flow where callers receive a secure link to reach the business.
  const useCaseSummary =
    `${biz.name} uses this toll-free number to respond to people who contact us. ` +
    `When a customer calls or texts, we send a one-time SMS containing a secure link to our ` +
    `contact page, where they can chat with us, leave a message, or request a callback. ` +
    `We only message people who reached out to us first, and every text includes opt-out instructions.`;

  return (
    <div className="max-w-5xl">
      <Link
        href="/dashboard/calls"
        className="inline-flex items-center gap-1 text-sm text-[#8a897f] hover:text-[#1b1a14] transition"
      >
        <ChevronLeftIcon size={15} /> Back to Calls
      </Link>

      <h1 className="mt-3 text-3xl font-extrabold text-[#232219] tracking-tight">
        Business verification
      </h1>
      <p className="text-sm text-[#8a897f] mt-1.5 max-w-xl">
        Complete this once to finish setting up SMS on your toll-free number. Voice is
        already live — SMS switches on as soon as the carrier approves your business.
      </p>

      <SmsVerificationCard
        live={twilioEnabled && number?.provider === "twilio"}
        lockedTollFree={number?.phoneNumber ?? ""}
        defaults={{
          businessName: biz.name,
          website: biz.website,
          address: biz.location,
          contactName: "",
          contactEmail: biz.email,
          contactPhone: biz.phone,
          tollFreeNumber: number?.phoneNumber ?? "",
          sampleMessage,
          useCaseSummary,
        }}
      />
    </div>
  );
}
