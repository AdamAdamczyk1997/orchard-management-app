import { Card } from "@/components/ui/card";

function HarvestSeasonSummaryLoadingCard(props: { className?: string }) {
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

export default function HarvestSeasonSummaryLoading() {
  return (
    <div className="grid gap-6">
      <HarvestSeasonSummaryLoadingCard />
      <HarvestSeasonSummaryLoadingCard />
      <div className="grid gap-4 md:grid-cols-3">
        <HarvestSeasonSummaryLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
        <HarvestSeasonSummaryLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
        <HarvestSeasonSummaryLoadingCard className="border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none" />
      </div>
      <HarvestSeasonSummaryLoadingCard />
      <HarvestSeasonSummaryLoadingCard />
    </div>
  );
}
