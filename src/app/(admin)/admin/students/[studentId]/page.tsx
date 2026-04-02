import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import ContentTypeIcon from '@/components/ContentTypeIcon';
import EnrollCourseModal from '@/components/admin/EnrollCourseModal';

export default async function StudentDetailPage({
  params,
}: {
  params: { studentId: string };
}) {
  const supabase = createServerSupabaseClient();

  // 受講生プロフィール
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.studentId)
    .single();

  if (!student) notFound();

  // 受講中の講座と進捗詳細
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      course_id, enrolled_at,
      courses (id, title, category)
    `)
    .eq('user_id', params.studentId);

  const coursesDetail = await Promise.all(
    (enrollments || []).map(async (enrollment: any) => {
      const course = enrollment.courses;
      if (!course) return null;

      const { data: sections } = await supabase
        .from('course_sections')
        .select('id, title, sort_order')
        .eq('course_id', course.id)
        .order('sort_order');

      const sectionsWithLessons = await Promise.all(
        (sections || []).map(async (section: any) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id, title, content_type, duration_minutes, sort_order')
            .eq('section_id', section.id)
            .order('sort_order');

          const lessonsWithProgress = await Promise.all(
            (lessons || []).map(async (lesson: any) => {
              const { data: progress } = await supabase
                .from('lesson_progress')
                .select('is_completed, completed_at')
                .eq('user_id', params.studentId)
                .eq('lesson_id', lesson.id)
                .single();

              return { ...lesson, progress };
            })
          );

          return { ...section, lessons: lessonsWithProgress };
        })
      );

      const totalLessons = sectionsWithLessons.reduce(
        (acc, s) => acc + s.lessons.length, 0
      );
      const completedLessons = sectionsWithLessons.reduce(
        (acc, s) => acc + s.lessons.filter((l: any) => l.progress?.is_completed).length,
        0
      );

      return {
        ...course,
        enrolled_at: enrollment.enrolled_at,
        sections: sectionsWithLessons,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
      };
    })
  );

  const validCourses = coursesDetail.filter(Boolean);

  // 全公開講座を取得（EnrollCourseModal用）
  const { data: allCourses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true)
    .order('sort_order');

  const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id);

  // 最近の学習履歴
  const { data: activityHistory } = await supabase
    .from('lesson_progress')
    .select(`
      is_completed, completed_at, updated_at,
      lessons (title, content_type)
    `)
    .eq('user_id', params.studentId)
    .order('updated_at', { ascending: false })
    .limit(20);

  const daysSinceLogin = student.last_login_at
    ? Math.floor(
        (Date.now() - new Date(student.last_login_at).getTime()) /
        (1000 * 60 * 60 * 24)
      )
    : null;

  const isInactive = daysSinceLogin === null || daysSinceLogin >= 7;

  return (
    <div className="space-y-6">
      {/* パンくず */}
      <nav className="text-sm text-gray-500">
        <Link href="/admin/students" className="hover:text-primary-600">
          受講生管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{student.full_name || student.email}</span>
      </nav>

      {/* プロフィールヘッダー */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
            {(student.full_name || student.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                {student.full_name || '未設定'}
              </h1>
              {isInactive ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                  停滞中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                  活動中
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{student.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <span>
                登録日: {new Date(student.created_at).toLocaleDateString('ja-JP')}
              </span>
              <span>
                最終ログイン:{' '}
                {student.last_login_at
                  ? `${new Date(student.last_login_at).toLocaleDateString('ja-JP')}（${daysSinceLogin === 0 ? '今日' : `${daysSinceLogin}日前`}）`
                  : '未ログイン'}
              </span>
            </div>
          </div>
          {/* 講座登録ボタン */}
          <div className="flex-shrink-0">
            <EnrollCourseModal
              studentId={student.id}
              studentName={student.full_name || student.email}
              availableCourses={allCourses || []}
              enrolledCourseIds={enrolledCourseIds}
            />
          </div>
        </div>
      </div>

      {/* 受講中の講座詳細 */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">受講中の講座</h2>

        {validCourses.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            受講登録されている講座がありません
          </div>
        ) : (
          validCourses.map((course: any) => (
            <div key={course.id} className="card">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{course.title}</h3>
                  <span className="text-sm text-gray-500">
                    {course.completed_lessons}/{course.total_lessons} レッスン完了
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar percent={course.progress_percent} size="md" showLabel={true} />
                </div>
              </div>

              {/* セクション内のレッスン進捗 */}
              <div className="divide-y divide-gray-50">
                {course.sections.map((section: any) => (
                  <div key={section.id}>
                    <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
                      {section.title}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {section.lessons.map((lesson: any) => (
                        <div
                          key={lesson.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${
                            lesson.progress?.is_completed ? 'bg-green-50/50' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            lesson.progress?.is_completed
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200'
                          }`}>
                            {lesson.progress?.is_completed && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <ContentTypeIcon type={lesson.content_type} size="sm" />
                          <span className="text-sm text-gray-700 flex-1">{lesson.title}</span>
                          {lesson.progress?.completed_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(lesson.progress.completed_at).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 学習履歴 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">最近の学習履歴</h2>
        <div className="card divide-y divide-gray-100">
          {(activityHistory || []).length === 0 ? (
            <p className="p-4 text-sm text-gray-500">学習履歴がありません</p>
          ) : (
            (activityHistory || []).map((activity: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className={`w-2 h-2 rounded-full ${
                  activity.is_completed ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <ContentTypeIcon
                  type={activity.lessons?.content_type || 'text'}
                  size="sm"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {activity.lessons?.title}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(activity.updated_at).toLocaleString('ja-JP')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
