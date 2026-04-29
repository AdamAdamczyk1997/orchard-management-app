import { Card } from "@/components/ui/card";

function HarvestLocationLoadingCard(props: { className?: string }) {
  return (
    <Card className={props.className}>
      <div className="grid animate-pulse gap-3">
        <div className="h-3 w-24 rounded-full bg-[#eadfcb]" />
        <div className="h-8 w-48 rounded-2xl bg-[#e6dbc7]" />
        <div className="h-4 w-full rounded-full bg-[#f0e7d7]" />
        <div className="h-4 w-4/5 rounded-full bg-[#f0e7d7]" />
      </div>
    </Card>
  );
}

export default function HarvestLocationSummaryLoading() {
  return (
    <div className="grid gap-6">
      <HarvestLocationLoadingCard />
      <HarvestLocationLoadingCard />
      <div className="grid gap-4 md:grid-cols-3">
        <HarvestLocationLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
        <HarvestLocationLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
        <HarvestLocationLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
      </div>
      <HarvestLocationLoadingCard />
      <HarvestLocationLoadingCard />
    </div>
  );
}
