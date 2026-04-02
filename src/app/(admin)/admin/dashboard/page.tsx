import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient();

  // 統計データを取得
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  const { count: totalCourses } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });

  const { count: totalEnrollments } = await supabase
    .from('course_enrollments')
    .select('*', { count: 'exact', head: true });

  const { count: totalCompletedLessons } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', true);

  // 最近アクティブな受講生（7日以内にログインしていない人を「止まっている」と判定）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: inactiveStudents } = await supabase
    .from('profiles')
    .select('id, email, full_name, last_login_at')
    .eq('role', 'student')
    .or(`last_login_at.is.null,last_login_at.lt.${sevenDaysAgo.toISOString()}`)
    .limit(10);

  // 最近の学習活動
  const { data: recentActivity } = await supabase
    .from('lesson_progress')
    .select(`
      user_id, is_completed, updated_at,
      lessons (title),
      profiles:user_id (full_name, email)
    `)
    .eq('is_completed', true)
    .order('updated_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">受講生数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalStudents || 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">講座数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCourses || 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">受講登録数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalEnrollments || 0}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">完了レッスン数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCompletedLessons || 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 止まっている受講生 */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 bg-red-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              学習が止まっている受講生
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              7日以上ログインしていません
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {(inactiveStudents || []).length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                全員アクティブです
              </p>
            ) : (
              (inactiveStudents || []).map((student: any) => (
                <Link
                  key={student.id}
                  href={`/admin/students/${student.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.full_name || student.email}
                    </p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">
                      {student.last_login_at
                        ? `最終: ${new Date(student.last_login_at).toLocaleDateString('ja-JP')}`
                        : '未ログイン'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* 最近の学習活動 */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">最近の学習活動</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(recentActivity || []).length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                まだ学習活動がありません
              </p>
            ) : (
              (recentActivity || []).map((activity: any, i: number) => (
                <div key={i} className="p-4">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">
                      {activity.profiles?.full_name || activity.profiles?.email || '不明'}
                    </span>
                    {' が「'}
                    <span className="font-medium">{activity.lessons?.title}</span>
                    {'」を完了'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(activity.updated_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* クイックリンク */}
      <div className="flex gap-4">
        <Link href="/admin/students" className="btn-primary">
          受講生一覧を見る
        </Link>
      </div>
    </div>
  );
}
