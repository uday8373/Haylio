import type { LeadTag } from "@/lib/types";

export const TAG_META: Record<LeadTag, { label: string; cls: string; dot: string }> = {
  none: { label: "New", cls: "bg-[#f3f3ef] border-[#e3e3df] text-[#8a897f]", dot: "bg-[#b9b8ae]" },
  hot: { label: "Hot", cls: "bg-[#fdecea] border-[#f3c8c0] text-[#c0392b]", dot: "bg-[#c0392b]" },
  warm: { label: "Warm", cls: "bg-[#fff4e5] border-[#f6dcb0] text-[#a96a16]", dot: "bg-[#d4912f]" },
  qualified: { label: "Qualified", cls: "bg-[#eaf3e6] border-[#cfe3c6] text-[#3e7d3a]", dot: "bg-[#3e7d3a]" },
  cold: { label: "Cold", cls: "bg-[#eef2f7] border-[#d6e0ec] text-[#5b6b80]", dot: "bg-[#7c97c9]" },
};

export const TAG_ORDER: LeadTag[] = ["none", "hot", "warm", "qualified", "cold"];

export function TagBadge({ tag }: { tag: LeadTag }) {
  const m = TAG_META[tag];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}

export function scoreColor(score: number): string {
  if (score >= 70) return "#3e7d3a";
  if (score >= 40) return "#d4912f";
  return "#a6a59c";
}
