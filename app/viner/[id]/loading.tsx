// Plassering: app/viner/[id]/loading.tsx

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-32 bg-cream-100 rounded animate-pulse" />

      <div className="kort p-6 md:p-8 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-32 h-48 bg-cream-100 rounded mx-auto sm:mx-0 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-9 bg-cream-100 rounded w-3/4" />
            <div className="h-4 bg-cream-100 rounded w-1/2" />
            <div className="h-7 bg-cream-100 rounded w-1/4 mt-3" />
            <div className="h-4 bg-cream-100 rounded w-full mt-4" />
            <div className="h-4 bg-cream-100 rounded w-5/6" />
          </div>
        </div>
      </div>

      <div>
        <div className="h-7 bg-cream-100 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="kort p-6 animate-pulse">
              <div className="h-6 bg-cream-100 rounded w-2/3 mb-3" />
              <div className="h-4 bg-cream-100 rounded w-1/3 mb-2" />
              <div className="h-16 bg-cream-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
