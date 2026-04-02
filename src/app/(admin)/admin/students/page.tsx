import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import AddStudentModal from '@/components/admin/AddStudentModal';

export default async function StudentsPage() {
  const supabase = createServerSupabaseClient();

  // 全受講生を取得
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  // 各受講生の受講状況を取得
  const studentsWithDetails = await Promise.all(
    (students || []).map(async (student: any) => {
      // 受講登録を取得
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          courses (id, title)
        `)
        .eq('user_id', student.id);

      // 各講座の進捗を計算
      const courses = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const course = enrollment.courses;
          if (!course) return null;

          const { data: sections } = await supabase
            .from('course_sections')
            .select('id')
            .eq('course_id', course.id);

          const sectionIds = (sections || []).map((s: any) => s.id);
          let totalLessons = 0;
          let completedLessons = 0;

          if (sectionIds.length > 0) {
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .in('section_id', sectionIds);

            totalLessons = lessons?.length || 0;

            if (lessons && lessons.length > 0) {
              const lessonIds = lessons.map((l: any) => l.id);
              const { count } = await supabase
                .from('lesson_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', student.id)
                .eq('is_completed', true)
                .in('lesson_id', lessonIds);

              completedLessons = count || 0;
            }
          }

          return {
            id: course.id,
            title: course.title,
            progress_percent: totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0,
          };
        })
      );

      // 最後に視聴したレッスン
      const { data: lastProgress } = await supabase
        .from('lesson_progress')
        .select(`
          updated_at,
          lessons (title)
        `)
        .eq('user_id', student.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      // 平均進捗
      const validCourses = courses.filter(Boolean);
      const avgProgress = validCourses.length > 0
        ? Math.round(
            validCourses.reduce((sum, c) => sum + (c?.progress_percent || 0), 0) /
            validCourses.length
          )
        : 0;

      // 何日前にログインしたか
      const daysSinceLogin = student.last_login_at
        ? Math.floor(
            (Date.now() - new Date(student.last_login_at).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        ...student,
        courses: validCourses,
        avg_progress: avgProgress,
        last_lesson: lastProgress?.[0] || null,
        days_since_login: daysSinceLogin,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">受講生管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            {students?.length || 0}名の受講生
          </p>
        </div>
        <AddStudentModal />
      </div>

      {/* 受講生テーブル（デスクトップ） */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">受講生</th>
                <th className="px-4 py-3 font-medium">受講中講座</th>
                <th className="px-4 py-3 font-medium w-32">平均進捗</th>
                <th className="px-4 py-3 font-medium">最後の学習</th>
                <th className="px-4 py-3 font-medium">最終ログイン</th>
                <th className="px-4 py-3 font-medium w-16">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(studentsWithDetails || []).map((student: any) => {
                const isInactive = student.days_since_login === null || student.days_since_login >= 7;

                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="hover:text-primary-600"
                      >
                        <p className="font-medium text-gray-900">
                          {student.full_name || '未設定'}
                        </p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {student.courses.length === 0 ? (
                          <span className="text-sm text-gray-400">未登録</span>
                        ) : (
                          student.courses.map((c: any) => (
                            <div key={c.id} className="text-sm">
                              <span className="text-gray-700">{c.title}</span>
                              <span className="text-gray-400 ml-2">{c.progress_percent}%</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        percent={student.avg_progress}
                        size="sm"
                        showLabel={true}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {student.last_lesson ? (
                        <div>
                          <p className="text-sm text-gray-700">
                            {(student.last_lesson as any).lessons?.title || '-'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date((student.last_lesson as any).updated_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">学習なし</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">
                        {student.last_login_at
                          ? new Date(student.last_login_at).toLocaleDateString('ja-JP')
                          : '未ログイン'}
                      </p>
                      {student.days_since_login !== null && (
                        <p className="text-xs text-gray-400">
                          {student.days_since_login === 0
                            ? '今日'
                            : `${student.days_since_login}日前`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isInactive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          停滞
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          活動中
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(!students || students.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            受講生がまだ登録されていません
          </div>
        )}
      </div>
    </div>
  );
}
