// Plassering: app/statistikk/loading.tsx

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="text-center mb-10">
        <div className="h-14 w-48 mx-auto bg-cream-100 rounded animate-pulse mb-3" />
        <div className="gold-line w-24 mx-auto" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="kort p-6 animate-pulse">
          <div className="h-6 bg-cream-100 rounded w-1/3 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 bg-cream-100 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
