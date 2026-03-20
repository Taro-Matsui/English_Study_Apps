export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="sticky top-0 bg-slate-50/95 dark:bg-gray-900/95 border-b border-gray-100 dark:border-white/5 px-4 py-3">
        <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
      <div className="px-4 pt-4 space-y-2.5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    </div>
  )
}
