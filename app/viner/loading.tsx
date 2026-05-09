// Loading-skjerm som vises mens siden lastes
// Plassering: app/viner/loading.tsx

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="h-14 w-48 mx-auto bg-cream-100 rounded animate-pulse mb-3" />
        <div className="gold-line w-24 mx-auto" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="kort p-5 flex gap-4 animate-pulse">
            <div className="w-16 h-24 bg-cream-100 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-cream-100 rounded w-3/4" />
              <div className="h-3 bg-cream-100 rounded w-1/2" />
              <div className="h-8 bg-cream-100 rounded w-1/3 mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
