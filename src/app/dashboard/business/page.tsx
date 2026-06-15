import BusinessTabs from "@/components/dashboard/BusinessTabs";

export const dynamic = "force-dynamic";

export default function BusinessPage() {
  return (
    <div className="max-w-5xl">
      <BusinessTabs />
    </div>
  );
}
