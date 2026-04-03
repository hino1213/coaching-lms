export default function LessonLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="h-7 w-64 bg-gray-200 rounded" />

      {/* ã³ã³ãã³ãã¨ãªã¢ */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="aspect-video bg-gray-200 rounded-lg" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-4/6 bg-gray-100 rounded" />
      </div>

      {/* ãããã¿ã³ */}
      <div className="flex justify-between">
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
