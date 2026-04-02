'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import VideoEmbed from '@/components/VideoEmbed';
import MarkdownContent from '@/components/MarkdownContent';
import ContentTypeIcon from '@/components/ContentTypeIcon';
import type { Lesson, LessonProgress } from '@/lib/types/database';

interface Props {
  lesson: Lesson & { course_sections: any };
  progress: LessonProgress | null;
  userId: string;
  courseId: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
}

export default function LessonContent({
  lesson,
  progress,
  userId,
  courseId,
  prevLesson,
  nextLesson,
}: Props) {
  const [isCompleted, setIsCompleted] = useState(progress?.is_completed || false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggleComplete = async () => {
    setSaving(true);
    const newStatus = !isCompleted;

    if (progress) {
      // 既存の進捗を更新
      await supabase
        .from('lesson_progress')
        .update({
          is_completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('id', progress.id);
    } else {
      // 新規作成
      await supabase
        .from('lesson_progress')
        .insert({
          user_id: userId,
          lesson_id: lesson.id,
          is_completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
        });
    }

    setIsCompleted(newStatus);
    setSaving(false);
    router.refresh();
  };

  const contentTypeLabels: Record<string, string> = {
    video: '動画レッスン',
    text: 'テキスト教材',
    work: 'ワーク',
  };

  return (
    <div className="space-y-6">
      {/* レッスンヘッダー */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <ContentTypeIcon type={lesson.content_type} size="md" />
          <div className="flex-1">
            <span className="text-sm text-gray-500">
              {lesson.course_sections?.title}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
              {lesson.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{contentTypeLabels[lesson.content_type]}</span>
              {lesson.duration_minutes > 0 && (
                <span>{lesson.duration_minutes}分</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ本体 */}
      <div className="card overflow-hidden">
        {/* 動画 */}
        {lesson.content_type === 'video' && lesson.video_url && (
          <VideoEmbed url={lesson.video_url} />
        )}

        {/* テキスト / ワーク */}
        {(lesson.content_type === 'text' || lesson.content_type === 'work') &&
          lesson.text_content && (
            <div className="p-6">
              <MarkdownContent content={lesson.text_content} />
            </div>
          )}

        {/* 動画 + 補足テキスト */}
        {lesson.content_type === 'video' && lesson.text_content && (
          <div className="p-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">補足テキスト</h3>
            <MarkdownContent content={lesson.text_content} />
          </div>
        )}

        {/* レッスン説明 */}
        {lesson.description && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">{lesson.description}</p>
          </div>
        )}
      </div>

      {/* 視聴済みボタン */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={toggleComplete}
            disabled={saving}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition ${
              isCompleted
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {saving ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : isCompleted ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            )}
            {isCompleted ? '視聴済み' : 'このレッスンを完了にする'}
          </button>

          {isCompleted && (
            <p className="text-sm text-green-600">
              完了済みです。もう一度見ることもできます。
            </p>
          )}
        </div>
      </div>

      {/* 前後のレッスンナビゲーション */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {prevLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${prevLesson.id}`}
            className="btn-secondary flex-1 text-left"
          >
            <span className="block text-xs text-gray-400">前のレッスン</span>
            <span className="block text-sm mt-0.5">{prevLesson.title}</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {nextLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${nextLesson.id}`}
            className="btn-primary flex-1 text-right"
          >
            <span className="block text-xs opacity-80">次のレッスン</span>
            <span className="block text-sm mt-0.5">{nextLesson.title}</span>
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="btn-secondary flex-1 text-right"
          >
            <span className="block text-sm">講座トップに戻る</span>
          </Link>
        )}
      </div>
    </div>
  );
}
