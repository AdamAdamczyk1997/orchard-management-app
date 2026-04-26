import { Card } from "@/components/ui/card";

type ListPageLoadingProps = {
  filterFieldCount?: number;
  listItemCount?: number;
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-2xl bg-[#eadfcb] ${className}`} />;
}

export function ListPageLoading({
  filterFieldCount = 3,
  listItemCount = 3,
}: ListPageLoadingProps) {
  return (
    <div className="grid gap-6">
      <Card>
        <div className="grid animate-pulse gap-3">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
      </Card>

      <Card>
        <div className="grid animate-pulse gap-4">
          <div className="grid gap-2">
            <SkeletonBlock className="h-6 w-28" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: filterFieldCount }).map((_, index) => (
              <div className="grid gap-2" key={`field-${index}`}>
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
              <SkeletonBlock className="h-11 w-28" />
              <SkeletonBlock className="h-11 w-36" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {Array.from({ length: listItemCount }).map((_, index) => (
          <Card key={`list-item-${index}`}>
            <div className="grid animate-pulse gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid flex-1 gap-2">
                  <SkeletonBlock className="h-7 w-48" />
                  <SkeletonBlock className="h-4 w-40" />
                </div>
                <SkeletonBlock className="h-11 w-24" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-4 w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
