import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 受講中の講座を取得
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      course_id,
      enrolled_at,
      courses (
        id, title, description, thumbnail_url, category
      )
    `)
    .eq('user_id', user.id);

  // 各講座の進捗を計算
  const coursesWithProgress = await Promise.all(
    (enrollments || []).map(async (enrollment: any) => {
      const course = enrollment.courses;
      if (!course) return null;

      // 講座内の全レッスン数を取得
      const { data: sections } = await supabase
        .from('course_sections')
        .select('id')
        .eq('course_id', course.id);

      const sectionIds = (sections || []).map((s: any) => s.id);

      let totalLessons = 0;
      let completedLessons = 0;

      if (sectionIds.length > 0) {
        const { count: total } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .in('section_id', sectionIds);

        totalLessons = total || 0;

        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .in('section_id', sectionIds);

        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map((l: any) => l.id);
          const { count: completed } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .in('lesson_id', lessonIds);

          completedLessons = completed || 0;
        }
      }

      const progressPercent = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      return {
        ...course,
        enrolled_at: enrollment.enrolled_at,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: progressPercent,
      };
    })
  );

  const validCourses = coursesWithProgress.filter(Boolean);

  // 次に見るべきレッスンを取得（最後に視聴したものの次）
  const { data: recentProgress } = await supabase
    .from('lesson_progress')
    .select(`
      lesson_id,
      updated_at,
      lessons (
        id, title, section_id,
        course_sections (
          course_id,
          courses (title)
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('is_completed', true)
    .order('updated_at', { ascending: false })
    .limit(1);

  const categoryLabels: Record<string, string> = {
    coaching: 'コーチング',
    counseling: 'カウンセリング',
    mindset: 'マインドセット',
    general: 'その他',
  };

  return (
    <div className="space-y-8">
      {/* ウェルカムメッセージ */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          おかえりなさい、{profile?.full_name || 'ゲスト'}さん
        </h1>
        <p className="text-gray-500 mt-1">学習を続けましょう</p>
      </div>

      {/* 最近の学習状況 */}
      {recentProgress && recentProgress.length > 0 && (
        <div className="card p-5 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <p className="text-sm text-primary-600 font-medium mb-1">最近の学習</p>
          <p className="text-gray-800 font-medium">
            「{(recentProgress[0] as any).lessons?.title}」を完了しました
          </p>
        </div>
      )}

      {/* 受講中の講座一覧 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">受講中の講座</h2>
        {validCourses.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500">まだ受講中の講座がありません</p>
            <p className="text-sm text-gray-400 mt-1">
              管理者に講座の登録を依頼してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {validCourses.map((course: any) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="card hover:shadow-md transition-shadow group"
              >
                {/* サムネイル */}
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <span className="text-4xl opacity-60">
                    {course.category === 'coaching' ? '🎯' :
                     course.category === 'mindset' ? '🧠' :
                     course.category === 'counseling' ? '💬' : '📚'}
                  </span>
                </div>

                <div className="p-4">
                  {/* カテゴリバッジ */}
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 mb-2">
                    {categoryLabels[course.category] || course.category}
                  </span>

                  <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  {/* 進捗バー */}
                  <div className="mt-4">
                    <ProgressBar
                      percent={course.progress_percent}
                      size="sm"
                      showLabel={true}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {course.completed_lessons}/{course.total_lessons} レッスン完了
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
