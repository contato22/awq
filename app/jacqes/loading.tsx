export default function JacqesLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="flex items-end gap-2 h-40">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded-t"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
        <div className="h-5 w-36 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-t border-gray-50">
            <div className="h-4 w-1/3 bg-gray-100 rounded" />
            <div className="h-4 w-1/4 bg-gray-100 rounded" />
            <div className="h-4 w-1/5 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
