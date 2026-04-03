export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />

      {/* çµ±è¨ã«ã¼ã */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* ä¸æ®µ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="py-3 border-b border-gray-100">
              <div className="h-4 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="card p-5">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
