import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import LessonEditor from './LessonEditor';

interface Props {
  params: { courseId: string; lessonId: string };
}

export default async function AdminLessonEditPage({ params }: Props) {
  const supabase = createServerSupabaseClient();

  const { data: lesson } = await supabase
    .from('lessons')
    .select(`*, course_sections(title, course_id)`)
    .eq('id', params.lessonId)
    .single();

  if (!lesson) notFound();

  // このレッスンに紐づくクイズを取得
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

  // クイズの問題を sort_order でソート、選択肢も sort_order でソート
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

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/courses/${params.courseId}`}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-sm text-gray-500">
            {lesson.course_sections?.title}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
        </div>
      </div>

      <LessonEditor
        lesson={lesson}
        quiz={sortedQuiz}
        courseId={params.courseId}
      />
    </div>
  );
}
