'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  title: string;
}

interface EnrolledCourse {
  id: string;
}

interface Props {
  studentId: string;
  studentName: string;
  availableCourses: Course[];
  enrolledCourseIds: string[];
}

export default function EnrollCourseModal({
  studentId,
  studentName,
  availableCourses,
  enrolledCourseIds,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  const unenrolledCourses = availableCourses.filter(
    (c) => !enrolledCourseIds.includes(c.id)
  );

  const enrolledCourses = availableCourses.filter(
    (c) => enrolledCourseIds.includes(c.id)
  );

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/enroll-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: studentId, course_id: selectedCourseId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      const courseName = availableCourses.find((c) => c.id === selectedCourseId)?.title;
      setSuccess(`「${courseName}」に登録しました`);
      setSelectedCourseId('');
      router.refresh();

      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId: string, courseName: string) => {
    if (!confirm(`「${courseName}」の登録を解除しますか？\n学習進捗データは保持されます。`)) return;
    setUnenrolling(courseId);

    try {
      const res = await fetch('/api/admin/enroll-student', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: studentId, course_id: courseId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '解除に失敗しました');
        return;
      }

      router.refresh();
    } catch {
      alert('通信エラーが発生しました');
    } finally {
      setUnenrolling(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        講座を登録
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !loading && setIsOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">講座を登録</h2>
                <p className="text-sm text-gray-500 mt-0.5">{studentName}</p>
              </div>
              <button
                onClick={() => !loading && setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 現在の受講講座 */}
            {enrolledCourses.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-medium text-gray-700 mb-2">現在の受講講座</h3>
                <div className="space-y-2">
                  {enrolledCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-800">{course.title}</span>
                      <button
                        onClick={() => handleUnenroll(course.id, course.title)}
                        disabled={unenrolling === course.id}
                        className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-50 ml-2 flex-shrink-0"
                      >
                        {unenrolling === course.id ? '解除中...' : '登録解除'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新規登録 */}
            {unenrolledCourses.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                追加できる講座がありません
              </div>
            ) : (
              <form onSubmit={handleEnroll} className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">講座を追加</h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                    {success}
                  </div>
                )}

                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                >
                  <option value="">講座を選択してください</option>
                  {unenrolledCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    閉じる
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedCourseId}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        登録中...
                      </span>
                    ) : (
                      '登録する'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
