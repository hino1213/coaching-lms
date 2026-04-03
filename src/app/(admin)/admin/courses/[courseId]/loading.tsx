export default function CourseDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded" />

      {/* è¬åº§ãããã¼ */}
      <div className="card p-6 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
        </div>
        <div className="h-7 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
      </div>

      {/* ã»ã¯ã·ã§ã³ä¸è¦§ */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 flex items-center justify-between">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="px-5 py-3 flex items-center gap-3">
                <div className="h-5 w-5 bg-gray-200 rounded" />
                <div className="h-4 flex-1 bg-gray-100 rounded" />
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
