'use client';

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-6 w-full">
      {/* Header Skeleton */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-200" />
          <div className="flex flex-col gap-2">
            <div className="w-48 h-5 bg-gray-200 rounded" />
            <div className="w-64 h-3 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-32 h-9 bg-gray-100 rounded-lg" />
          <div className="w-28 h-9 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between h-32">
            <div className="flex justify-between items-center">
              <div className="w-24 h-3 bg-gray-200 rounded" />
              <div className="w-7 h-7 bg-gray-100 rounded-lg" />
            </div>
            <div className="w-36 h-7 bg-gray-200 rounded my-2" />
            <div className="w-28 h-3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Charts Skeleton */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-6">
            <div className="w-40 h-5 bg-gray-200 rounded" />
            <div className="w-24 h-8 bg-gray-100 rounded" />
          </div>
          <div className="w-full h-72 bg-gray-50 rounded-lg flex items-end p-4 gap-4">
            <div className="w-1/6 h-2/3 bg-gray-200 rounded" />
            <div className="w-1/6 h-4/5 bg-gray-200 rounded" />
            <div className="w-1/6 h-1/2 bg-gray-200 rounded" />
            <div className="w-1/6 h-3/4 bg-gray-200 rounded" />
            <div className="w-1/6 h-5/6 bg-gray-200 rounded" />
            <div className="w-1/6 h-full bg-gray-200 rounded" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
          <div>
            <div className="w-32 h-5 bg-gray-200 rounded mb-4" />
            <div className="flex flex-col gap-3">
              <div className="w-full h-14 bg-gray-50 rounded-lg" />
              <div className="w-full h-14 bg-gray-50 rounded-lg" />
              <div className="w-full h-14 bg-gray-50 rounded-lg" />
            </div>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded mt-6" />
        </div>
      </div>
    </div>
  );
}
