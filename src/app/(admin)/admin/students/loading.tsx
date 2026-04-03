export default function StudentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['åè¬ç', 'åè¬ä¸­è¬åº§', 'å¹³åé²æ', 'æå¾ã®å­¦ç¿', 'æçµã­ã°ã¤ã³', 'ç¶æ'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...Array(4)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-36 bg-gray-100 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-12 bg-gray-200 rounded-full mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
