export default function CourseDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded" />
      <div className="h-4 w-full bg-gray-100 rounded" />
      <div className="h-4 w-3/4 bg-gray-100 rounded" />

      {[...Array(2)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gray-50">
            <div className="h-5 w-40 bg-gray-200 rounded" />
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="px-5 py-3 flex items-center gap-3">
                <div className="h-5 w-5 bg-gray-200 rounded-full" />
                <div className="h-4 flex-1 bg-gray-100 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
