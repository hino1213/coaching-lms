import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseSection, Lesson } from '@/lib/types/database';

const contentTypeLabels: Record<string, string> = {
  video: '🎬 動画',
  text: '📄 テキスト',
  work: '✏️ ワーク',
};

interface Props {
  params: { courseId: string };
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (!course) notFound();

  const { data: sections } = await supabase
    .from('course_sections')
    .select(`
      *,
      lessons (*)
    `)
    .eq('course_id', params.courseId)
    .order('sort_order', { ascending: true });

  // セクション内のレッスンもsort_orderでソート
  const sortedSections = (sections || []).map((section: any) => ({
    ...section,
    lessons: (section.lessons || []).sort(
      (a: Lesson, b: Lesson) => a.sort_order - b.sort_order
    ),
  }));

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-sm text-gray-500">講座管理</p>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        </div>
      </div>

      {/* セクション・レッスン一覧 */}
      <div className="space-y-4">
        {sortedSections.map((section: CourseSection & { lessons: Lesson[] }) => (
          <div key={section.id} className="card overflow-hidden">
            {/* セクションヘッダー */}
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">{section.title}</h2>
              {section.description && (
                <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
              )}
            </div>

            {/* レッスン一覧 */}
            <div className="divide-y divide-gray-100">
              {section.lessons.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">
                  レッスンがありません
                </p>
              ) : (
                section.lessons.map((lesson: Lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/admin/courses/${params.courseId}/lessons/${lesson.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm shrink-0">
                        {contentTypeLabels[lesson.content_type] || lesson.content_type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {lesson.video_url && (
                            <span className="text-xs text-blue-500">動画あり</span>
                          )}
                          {lesson.text_content && (
                            <span className="text-xs text-green-500">テキストあり</span>
                          )}
                          {lesson.duration_minutes > 0 && (
                            <span className="text-xs text-gray-400">
                              {lesson.duration_minutes}分
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-lg">
                        編集
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}

        {sortedSections.length === 0 && (
          <div className="card p-10 text-center text-gray-400">
            <p>セクションがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
