import { Card } from "@/components/ui/card";

function DashboardLoadingCard(props: { className?: string }) {
  return (
    <Card className={props.className}>
      <div className="grid animate-pulse gap-3">
        <div className="h-3 w-24 rounded-full bg-[#eadfcb]" />
        <div className="h-8 w-40 rounded-2xl bg-[#e6dbc7]" />
        <div className="h-4 w-full rounded-full bg-[#f0e7d7]" />
        <div className="h-4 w-4/5 rounded-full bg-[#f0e7d7]" />
      </div>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="grid gap-6">
      <DashboardLoadingCard />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
          <DashboardLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
        </div>
        <DashboardLoadingCard />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardLoadingCard />
        <DashboardLoadingCard />
        <DashboardLoadingCard />
      </div>
    </div>
  );
}
