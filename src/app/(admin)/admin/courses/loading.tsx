export default function CoursesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-gray-200 rounded" />
      </div>

      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-gray-200 rounded-full" />
                  <div className="h-5 w-14 bg-gray-200 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-100 rounded" />
              </div>
              <div className="h-5 w-5 bg-gray-200 rounded shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
