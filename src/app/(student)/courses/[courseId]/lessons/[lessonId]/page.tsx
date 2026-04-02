import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import LessonContent from './LessonContent';
import QuizPlayer from '@/components/QuizPlayer';

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 講座情報
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (!course) notFound();

  // レッスン情報
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      *,
      course_sections (
        id, title, course_id, sort_order
      )
    `)
    .eq('id', params.lessonId)
    .single();

  if (!lesson) notFound();

  // 進捗情報
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', params.lessonId)
    .maybeSingle();

  // クイズ情報
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_questions (
        *,
        quiz_options ( * )
      )
    `)
    .eq('lesson_id', params.lessonId)
    .maybeSingle();

  // クイズがある場合、問題・選択肢をsort_orderでソート
  const sortedQuiz = quiz
    ? {
        ...quiz,
        quiz_questions: (quiz.quiz_questions || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((q: any) => ({
            ...q,
            quiz_options: (q.quiz_options || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            ),
          })),
      }
    : null;

  // 直近のクイズ試行結果
  const previousAttempt = sortedQuiz
    ? await supabase
        .from('quiz_attempts')
        .select('score, total_questions, passed, completed_at')
        .eq('user_id', user.id)
        .eq('quiz_id', sortedQuiz.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data)
    : null;

  // 同じ講座の全レッスンを取得（前後のナビゲーション用）
  const { data: allSections } = await supabase
    .from('course_sections')
    .select('id, title, sort_order')
    .eq('course_id', params.courseId)
    .order('sort_order');

  const allLessons: any[] = [];
  for (const section of allSections || []) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, sort_order')
      .eq('section_id', section.id)
      .order('sort_order');

    (lessons || []).forEach(l => {
      allLessons.push({ ...l, sectionTitle: section.title });
    });
  }

  const currentIndex = allLessons.findIndex(l => l.id === params.lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      {/* パンくずリスト */}
      <nav className="text-sm text-gray-500 flex flex-wrap gap-1">
        <Link href="/dashboard" className="hover:text-primary-600">
          ダッシュボード
        </Link>
        <span>/</span>
        <Link href={`/courses/${params.courseId}`} className="hover:text-primary-600">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{lesson.title}</span>
      </nav>

      {/* レッスンコンテンツ */}
      <LessonContent
        lesson={lesson}
        progress={progress}
        userId={user.id}
        courseId={params.courseId}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
      />

      {/* 復習クイズ（クイズが設定されている場合のみ表示） */}
      {sortedQuiz && sortedQuiz.quiz_questions?.length > 0 && (
        <div>
          <QuizPlayer
            quiz={sortedQuiz}
            userId={user.id}
            previousAttempt={previousAttempt}
          />
        </div>
      )}
    </div>
  );
}
