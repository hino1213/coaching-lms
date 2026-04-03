export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-5 w-3/4 bg-gray-200 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded-full" />
            <div className="h-4 w-1/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
