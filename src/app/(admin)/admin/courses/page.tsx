import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import type { Course } from '@/lib/types/database';

const categoryColors: Record<string, string> = {
  coaching: 'bg-blue-100 text-blue-700',
  counseling: 'bg-purple-100 text-purple-700',
  mindset: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
};

const categoryLabels: Record<string, string> = {
  coaching: 'コーチング',
  counseling: 'カウンセリング',
  mindset: 'マインドセット',
  general: '一般',
};

export default async function AdminCoursesPage() {
  const supabase = createServerSupabaseClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">講座管理</h1>
        <Link
          href="/admin/courses/new"
          className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規講座を作成
        </Link>
      </div>

      {/* 講座一覧 */}
      <div className="grid gap-4">
        {(courses || []).map((course: Course) => (
          <Link
            key={course.id}
            href={`/admin/courses/${course.id}`}
            className="card p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-start justify-between gap-4">
              {course.thumbnail_url && (
                <div className="w-24 h-16 relative rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={course.thumbnail_url}
                    alt={course.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      categoryColors[course.category] || categoryColors.general
                    }`}
                  >
                    {categoryLabels[course.category] || course.category}
                  </span>
                  {course.is_published ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      公開中
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      非公開
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {course.title}
                </h2>
                {course.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {course.description}
                  </p>
                )}
              </div>
              <div className="flex items-center text-primary-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}

        {(!courses || courses.length === 0) && (
          <div className="card p-10 text-center text-gray-400">
            <p>講座がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
