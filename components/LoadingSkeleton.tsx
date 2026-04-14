import { cn } from "@/lib/utils";

function SkeletonLine({ className }: { className?: string; [extra: string]: unknown }) {
  return <div className={cn("bg-gray-200/60 rounded animate-pulse", className)} />;
}

export function CardSkeleton({ className }: { className?: string; [extra: string]: unknown }) {
  return (
    <div className={cn("card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-10 w-10 rounded-xl" />
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-24" />
        <SkeletonLine className="h-4 w-32" />
      </div>
      <SkeletonLine className="h-px w-full" />
      <SkeletonLine className="h-3 w-28" />
    </div>
  );
}

export function KPIGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-5 w-5 rounded" />
        <SkeletonLine className="h-5 w-36" />
      </div>
      <div className="space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonLine key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <SkeletonLine key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-5 w-36" />
        <SkeletonLine className="h-5 w-20 rounded-full" />
      </div>
      <SkeletonLine className="h-48 w-full rounded-lg" />
      <div className="flex gap-4 justify-center">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="page-container animate-pulse">
      <KPIGridSkeleton />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartSkeleton className="xl:col-span-2" />
        <CardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
