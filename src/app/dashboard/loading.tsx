/**
 * Shown instantly when switching dashboard tabs, while the next page loads on
 * the server. Next.js prefetches this for every nav link, so a click always
 * gets immediate feedback instead of a frozen screen.
 */
export default function DashboardLoading() {
  return (
    <div data-loading aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[#e4e4df]" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-lg bg-[#e9e9e4]" />
      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[76px] rounded-[1.4rem] bg-white/70 border border-[#e8e8e4] flex items-center gap-4 px-5">
              <div className="w-10 h-10 rounded-2xl bg-[#ecece7]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-[#ecece7]" />
                <div className="h-3 w-2/3 rounded bg-[#f0f0ec]" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block h-72 rounded-[1.6rem] bg-white/70 border border-[#e8e8e4]" />
      </div>
    </div>
  );
}
