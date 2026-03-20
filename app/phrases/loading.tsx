export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white/95 border-b border-slate-100 px-4 py-3">
        <div className="h-9 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="px-4 pt-4 space-y-2.5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  )
}
