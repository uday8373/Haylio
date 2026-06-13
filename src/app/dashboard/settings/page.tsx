import { currentBusiness } from "@/lib/session";
import { BadgeCheckIcon, BellIcon, PhoneIcon, RotateIcon, UsersIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const biz = (await currentBusiness())!;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold text-[#232219] tracking-tight">Settings</h1>

      <section className="mt-7 card p-5 md:p-7 animate-fade-up">
        <h2 className="font-bold text-[#232219]">Account</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between border-b border-[#f0f0ec] pb-4">
            <dt className="text-[#8a897f]">Business</dt>
            <dd className="font-semibold text-[#232219] flex items-center gap-2">
              {biz.name}
              {biz.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3e6] border border-[#cfe3c6] px-2 py-0.5 text-[10px] font-bold text-[#3e7d3a]">
                  <BadgeCheckIcon size={11} /> GOOGLE VERIFIED
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between border-b border-[#f0f0ec] pb-4">
            <dt className="text-[#8a897f]">Email</dt>
            <dd className="font-semibold text-[#232219]">{biz.email}</dd>
          </div>
          <div className="flex justify-between border-b border-[#f0f0ec] pb-4">
            <dt className="text-[#8a897f]">Link handle</dt>
            <dd className="font-mono font-semibold text-[#e8552f]">/b/{biz.handle}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#8a897f]">Member since</dt>
            <dd className="font-semibold text-[#232219]">{new Date(biz.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-150">
        <h2 className="font-bold text-[#232219]">Coming soon</h2>
        <ul className="mt-4 space-y-3 text-sm text-[#8a897f]">
          <li className="flex items-center gap-3"><RotateIcon size={15} className="text-[#4b4a42]" /> Regenerate link (if your link ever gets abused)</li>
          <li className="flex items-center gap-3"><BellIcon size={15} className="text-[#4b4a42]" /> Email & push notifications for new messages</li>
          <li className="flex items-center gap-3"><PhoneIcon size={15} className="text-[#4b4a42]" /> Masked phone number & call proxy to your real number</li>
          <li className="flex items-center gap-3"><UsersIcon size={15} className="text-[#4b4a42]" /> Team members in the inbox</li>
        </ul>
      </section>
    </div>
  );
}
