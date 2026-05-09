// Plassering: app/mine-viner/loading.tsx

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-40 bg-cream-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-cream-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-1 border-b border-wine-900/10">
        <div className="h-9 w-24 bg-cream-100 rounded animate-pulse" />
        <div className="h-9 w-32 bg-cream-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kort p-3 flex gap-3 animate-pulse">
            <div className="w-12 h-16 bg-cream-100 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-cream-100 rounded w-3/4" />
              <div className="h-3 bg-cream-100 rounded w-1/2" />
              <div className="h-5 bg-cream-100 rounded w-1/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
