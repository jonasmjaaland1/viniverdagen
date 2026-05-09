// Plassering: app/klubbkvelder/loading.tsx

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="h-14 w-64 mx-auto bg-cream-100 rounded animate-pulse mb-3" />
        <div className="gold-line w-24 mx-auto" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kort p-6 animate-pulse">
            <div className="h-7 bg-cream-100 rounded w-2/3 mb-3" />
            <div className="h-4 bg-cream-100 rounded w-1/3 mb-4" />
            <div className="h-4 bg-cream-100 rounded w-full mb-2" />
            <div className="h-4 bg-cream-100 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
