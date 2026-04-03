export default function StudentDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* æ»ããã¿ã³ */}
      <div className="h-4 w-32 bg-gray-200 rounded" />

      {/* ãã­ãã£ã¼ã«ã«ã¼ã */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-56 bg-gray-100 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
          </div>
          <div className="h-9 w-28 bg-gray-200 rounded" />
        </div>
      </div>

      {/* è¬åº§é²æ */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded-full" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2 border-t border-gray-100">
                <div className="h-5 w-5 bg-gray-200 rounded" />
                <div className="h-4 flex-1 bg-gray-100 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
