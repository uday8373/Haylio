import BusinessTabs from "@/components/dashboard/BusinessTabs";
import { currentBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  // Loaded on the server (shares the layout's cached session lookup), so the
  // tabs render filled in instead of fetching /api/business after arrival.
  const { passwordHash: _omit, ...business } = (await currentBusiness())!;
  return (
    <div className="max-w-5xl">
      <BusinessTabs business={business} />
    </div>
  );
}
