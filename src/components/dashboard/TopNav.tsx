"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, SearchIcon, SettingsIcon, ZapIcon } from "@/components/icons";

const nav = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/business", label: "Business" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function TopNav({
  businessName,
  logoUrl,
  unread,
}: {
  businessName: string;
  logoUrl?: string;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function logout() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center gap-x-4 gap-y-1 px-4 md:px-7 pt-5 md:pt-6 pb-2 flex-wrap">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        <span className="w-9 h-9 rounded-full bg-[#e8552f] text-white flex items-center justify-center">
          <ZapIcon size={16} />
        </span>
        <span className="font-bold tracking-wide text-sm text-[#1b1a14] uppercase">Haylio</span>
      </Link>

      {/* Nav links — second row on mobile, inline on desktop */}
      <nav className="order-3 w-full mt-1 -mx-1 px-1 overflow-x-auto md:order-none md:w-auto md:mt-0 md:mx-0 md:px-0 md:ml-6 flex items-center gap-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nav.map((n) => {
          const active = n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`relative px-3.5 py-2 rounded-full transition whitespace-nowrap ${
                active ? "text-[#1b1a14] font-semibold" : "text-[#8a897f] hover:text-[#1b1a14]"
              }`}
            >
              {n.label}
              {active && <span className="absolute left-3.5 right-3.5 -bottom-0.5 h-[2px] rounded-full bg-[#1b1a14]" />}
            </Link>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2 md:gap-2.5">
        <div className="hidden md:flex items-center gap-2 bg-white border border-[#e8e8e4] rounded-full pl-4 pr-3 py-2 w-64">
          <input
            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-[#a6a59c] text-[#232219]"
            placeholder="Enter your search request..."
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push("/dashboard/inbox");
            }}
          />
          <SearchIcon size={16} className="text-[#a6a59c]" />
        </div>
        <Link href="/dashboard/settings" className="icon-btn" title="Settings">
          <SettingsIcon size={17} />
        </Link>
        <Link href="/dashboard/inbox" className="icon-btn relative" title="Notifications">
          <BellIcon size={17} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e8552f] text-white text-[9px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title={businessName}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-full overflow-hidden border border-[#e8e8e4] bg-[#21201a] text-white text-sm font-bold flex items-center justify-center hover:opacity-85 transition"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
            ) : (
              businessName.charAt(0)
            )}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-[#ececea] bg-white p-1.5 shadow-lg animate-scale-in"
            >
              <p className="px-3 py-2 text-xs text-[#8a897f] truncate border-b border-[#f0f0ec] mb-1">
                Signed in as <span className="font-semibold text-[#232219]">{businessName}</span>
              </p>
              <button
                role="menuitem"
                onClick={logout}
                className="w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-[#e8552f] hover:bg-[#fdf0eb] transition"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
