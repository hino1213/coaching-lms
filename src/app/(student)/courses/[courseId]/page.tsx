import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import ContentTypeIcon from '@/components/ContentTypeIcon';

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 講座情報を取得
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (!course) notFound();

  // 受講登録確認
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', params.courseId)
    .single();

  if (!enrollment) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-gray-900">この講座へのアクセス権がありません</h1>
        <p className="text-gray-500 mt-2">管理者にお問い合わせください</p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-block">
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  // セクションとレッスンを取得
  const { data: sections } = await supabase
    .from('course_sections')
    .select('*')
    .eq('course_id', params.courseId)
    .order('sort_order');

  // 各セクションのレッスンを取得
  const sectionsWithLessons = await Promise.all(
    (sections || []).map(async (section: any) => {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('section_id', section.id)
        .order('sort_order');

      // 各レッスンの進捗を取得
      const lessonsWithProgress = await Promise.all(
        (lessons || []).map(async (lesson: any) => {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', lesson.id)
            .single();

          return { ...lesson, progress };
        })
      );

      return { ...section, lessons: lessonsWithProgress };
    })
  );

  // 全体進捗を計算
  const totalLessons = sectionsWithLessons.reduce(
    (acc, s) => acc + s.lessons.length, 0
  );
  const completedLessons = sectionsWithLessons.reduce(
    (acc, s) => acc + s.lessons.filter((l: any) => l.progress?.is_completed).length,
    0
  );
  const progressPercent = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // 次に見るべきレッスンを特定
  let nextLesson: any = null;
  for (const section of sectionsWithLessons) {
    for (const lesson of section.lessons) {
      if (!lesson.progress?.is_completed) {
        nextLesson = { ...lesson, sectionTitle: section.title };
        break;
      }
    }
    if (nextLesson) break;
  }

  const categoryLabels: Record<string, string> = {
    coaching: 'コーチング',
    counseling: 'カウンセリング',
    mindset: 'マインドセット',
    general: 'その他',
  };

  const contentTypeLabels: Record<string, string> = {
    video: '動画',
    text: 'テキスト',
    work: 'ワーク',
  };

  return (
    <div className="space-y-6">
      {/* パンくずリスト */}
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-primary-600">
          ダッシュボード
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{course.title}</span>
      </nav>

      {/* 講座ヘッダー */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 mb-2">
              {categoryLabels[course.category] || course.category}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {course.description && (
              <p className="text-gray-600 mt-2">{course.description}</p>
            )}
          </div>
        </div>

        {/* 全体進捗 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              学習進捗
            </span>
            <span className="text-sm text-gray-500">
              {completedLessons}/{totalLessons} レッスン完了
            </span>
          </div>
          <ProgressBar percent={progressPercent} size="md" showLabel={true} />
        </div>

        {/* 次に見るレッスン */}
        {nextLesson && (
          <div className="mt-4">
            <Link
              href={`/courses/${params.courseId}/lessons/${nextLesson.id}`}
              className="btn-primary"
            >
              次のレッスンへ進む：{nextLesson.title}
            </Link>
          </div>
        )}

        {progressPercent === 100 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-700 font-bold text-lg">
              🎉 おめでとうございます！全レッスン完了です！
            </p>
          </div>
        )}
      </div>

      {/* セクション一覧 */}
      <div className="space-y-4">
        {sectionsWithLessons.map((section, sIndex) => {
          const sectionCompleted = section.lessons.filter(
            (l: any) => l.progress?.is_completed
          ).length;
          const sectionTotal = section.lessons.length;

          return (
            <div key={section.id} className="card">
              {/* セクションヘッダー */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">
                    <span className="text-primary-500 mr-2">
                      Section {sIndex + 1}
                    </span>
                    {section.title}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {sectionCompleted}/{sectionTotal}
                  </span>
                </div>
                {section.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {section.description}
                  </p>
                )}
              </div>

              {/* レッスン一覧 */}
              <div className="divide-y divide-gray-100">
                {section.lessons.map((lesson: any, lIndex: number) => {
                  const isCompleted = lesson.progress?.is_completed;

                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${params.courseId}/lessons/${lesson.id}`}
                      className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                        isCompleted ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {/* 完了チェック */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          lIndex + 1
                        )}
                      </div>

                      {/* コンテンツタイプアイコン */}
                      <ContentTypeIcon type={lesson.content_type} size="sm" />

                      {/* レッスン情報 */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          isCompleted ? 'text-gray-500' : 'text-gray-900'
                        }`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {contentTypeLabels[lesson.content_type]}
                          </span>
                          {lesson.duration_minutes > 0 && (
                            <span className="text-xs text-gray-400">
                              {lesson.duration_minutes}分
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 矢印 */}
                      <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
