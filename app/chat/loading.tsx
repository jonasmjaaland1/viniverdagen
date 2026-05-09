// Plassering: app/chat/loading.tsx

export default function Loading() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-9 w-32 bg-cream-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-cream-100 rounded animate-pulse" />
      </div>
      <div className="kort flex flex-col h-[calc(100vh-220px)] min-h-[500px] max-h-[800px] overflow-hidden">
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : ''}`}>
              {i % 2 !== 0 && <div className="w-9 h-9 rounded-full bg-cream-100 flex-shrink-0" />}
              <div className={`max-w-[60%] ${i % 2 === 0 ? 'bg-wine-100' : 'bg-cream-100'} rounded-2xl p-3`}>
                <div className="h-4 w-32 mb-2 bg-cream-50 rounded" />
                <div className="h-4 w-48 bg-cream-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
