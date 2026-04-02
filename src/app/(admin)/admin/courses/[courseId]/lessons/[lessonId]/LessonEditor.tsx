'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Lesson, QuizWithQuestions, QuizQuestionWithOptions, QuizOption } from '@/lib/types/database';

interface Props {
  lesson: Lesson & { course_sections: any };
  quiz: QuizWithQuestions | null;
  courseId: string;
}

interface QuestionDraft {
  id?: string;
  question_text: string;
  correct_option_index: number;
  explanation: string;
  sort_order: number;
  options: { id?: string; option_text: string; sort_order: number }[];
}

const contentTypeLabels: Record<string, string> = {
  video: '動画',
  text: 'テキスト',
  work: 'ワーク',
};

export default function LessonEditor({ lesson, quiz, courseId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // レッスン編集
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [textContent, setTextContent] = useState(lesson.text_content || '');
  const [duration, setDuration] = useState(lesson.duration_minutes || 0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // クイズ編集
  const [quizTitle, setQuizTitle] = useState(quiz?.title || '確認テスト');
  const [quizDescription, setQuizDescription] = useState(quiz?.description || '');
  const [passScore, setPassScore] = useState(quiz?.pass_score ?? 70);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    quiz?.quiz_questions?.map((q: QuizQuestionWithOptions) => ({
      id: q.id,
      question_text: q.question_text,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation || '',
      sort_order: q.sort_order,
      options: q.quiz_options?.map((o: QuizOption) => ({
        id: o.id,
        option_text: o.option_text,
        sort_order: o.sort_order,
      })) || [
        { option_text: '', sort_order: 0 },
        { option_text: '', sort_order: 1 },
        { option_text: '', sort_order: 2 },
        { option_text: '', sort_order: 3 },
      ],
    })) || []
  );
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizMsg, setQuizMsg] = useState('');

  // ============================================
  // レッスンコンテンツ保存
  // ============================================
  const saveLesson = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
      .from('lessons')
      .update({
        video_url: videoUrl.trim() || null,
        text_content: textContent.trim() || null,
        duration_minutes: Number(duration) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id);

    if (error) {
      setSaveMsg('エラー: ' + error.message);
    } else {
      setSaveMsg('保存しました！');
      router.refresh();
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // ============================================
  // クイズ問題の操作
  // ============================================
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        correct_option_index: 0,
        explanation: '',
        sort_order: prev.length,
        options: [
          { option_text: '', sort_order: 0 },
          { option_text: '', sort_order: 1 },
          { option_text: '', sort_order: 2 },
          { option_text: '', sort_order: 3 },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) =>
                j === oIndex ? { ...o, option_text: value } : o
              ),
            }
          : q
      )
    );
  };

  // ============================================
  // クイズ保存
  // ============================================
  const saveQuiz = async () => {
    setQuizSaving(true);
    setQuizMsg('');

    try {
      let quizId = quiz?.id;

      if (!quizId) {
        // クイズ新規作成
        const { data: newQuiz, error: quizErr } = await supabase
          .from('quizzes')
          .insert({
            lesson_id: lesson.id,
            title: quizTitle,
            description: quizDescription || null,
            pass_score: passScore,
          })
          .select()
          .single();
        if (quizErr) throw quizErr;
        quizId = newQuiz.id;
      } else {
        // クイズ更新
        const { error: quizErr } = await supabase
          .from('quizzes')
          .update({
            title: quizTitle,
            description: quizDescription || null,
            pass_score: passScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', quizId);
        if (quizErr) throw quizErr;
      }

      // 既存の問題をすべて削除して再作成（シンプルな実装）
      if (quiz?.id) {
        await supabase
          .from('quiz_questions')
          .delete()
          .eq('quiz_id', quizId!);
      }

      // 問題を新規挿入
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_text.trim()) continue;

        const { data: newQ, error: qErr } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            question_text: q.question_text,
            correct_option_index: q.correct_option_index,
            explanation: q.explanation || null,
            sort_order: i,
          })
          .select()
          .single();
        if (qErr) throw qErr;

        // 選択肢を挿入
        const optionsToInsert = q.options
          .filter((o) => o.option_text.trim())
          .map((o, j) => ({
            question_id: newQ.id,
            option_text: o.option_text,
            sort_order: j,
          }));
        if (optionsToInsert.length > 0) {
          const { error: oErr } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert);
          if (oErr) throw oErr;
        }
      }

      setQuizMsg('クイズを保存しました！');
      router.refresh();
    } catch (err: any) {
      setQuizMsg('エラー: ' + (err.message || '保存に失敗しました'));
    }

    setQuizSaving(false);
    setTimeout(() => setQuizMsg(''), 4000);
  };

  return (
    <div className="space-y-8">
      {/* ============================================
          レッスンコンテンツ編集
      ============================================ */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📝</span>
          <h2 className="text-lg font-bold text-gray-900">レッスンコンテンツ</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {contentTypeLabels[lesson.content_type] || lesson.content_type}
          </span>
        </div>

        {/* 動画URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            動画URL
          </label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/... または https://vimeo.com/..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          />
          <p className="text-xs text-gray-400 mt-1">
            YouTube埋め込みURL（youtube.com/embed/...）またはVimeo URLを入力
          </p>
        </div>

        {/* テキストコンテンツ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            テキスト・ワーク内容
            <span className="ml-2 text-xs text-gray-400 font-normal">
              Markdown記法が使用できます
            </span>
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={14}
            placeholder={'# 見出し\n\n本文テキスト\n\n## 小見出し\n\n- 箇条書き\n- 箇条書き'}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-y"
          />
        </div>

        {/* 所要時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所要時間（分）
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={0}
            max={999}
            className="w-32 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          />
        </div>

        {/* 保存ボタン */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={saveLesson}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? '保存中...' : 'レッスンを保存'}
          </button>
          {saveMsg && (
            <span
              className={`text-sm font-medium ${
                saveMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* ============================================
          クイズ編集
      ============================================ */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🧠</span>
          <h2 className="text-lg font-bold text-gray-900">復習クイズ（4択）</h2>
          {quiz && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
              設定済み {quiz.quiz_questions?.length || 0}問
            </span>
          )}
        </div>

        {/* クイズ設定 */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              クイズタイトル
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="確認テスト"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              合格ライン（%）
            </label>
            <input
              type="number"
              value={passScore}
              onChange={(e) => setPassScore(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            クイズの説明（任意）
          </label>
          <input
            type="text"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="このレッスンの内容を確認しましょう"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          />
        </div>

        {/* 問題一覧 */}
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">
                  問題 {qIdx + 1}
                </span>
                <button
                  onClick={() => removeQuestion(qIdx)}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  削除
                </button>
              </div>

              {/* 問題文 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  問題文
                </label>
                <textarea
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                  rows={2}
                  placeholder="問題文を入力してください"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                />
              </div>

              {/* 選択肢 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  選択肢（正解を選択してください）
                </label>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIdx, 'correct_option_index', oIdx)}
                        className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                          q.correct_option_index === oIdx
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 text-gray-400 hover:border-gray-400'
                        }`}
                        title="正解にする"
                      >
                        {oIdx === 0 ? 'A' : oIdx === 1 ? 'B' : oIdx === 2 ? 'C' : 'D'}
                      </button>
                      <input
                        type="text"
                        value={opt.option_text}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`選択肢 ${oIdx === 0 ? 'A' : oIdx === 1 ? 'B' : oIdx === 2 ? 'C' : 'D'}`}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition ${
                          q.correct_option_index === oIdx
                            ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                            : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ✅ マークのついた選択肢が正解になります
                </p>
              </div>

              {/* 解説 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  解説（任意）
                </label>
                <textarea
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                  rows={2}
                  placeholder="正解・不正解時に表示する解説を入力"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                />
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-sm">まだ問題がありません</p>
              <p className="text-xs mt-1">下の「問題を追加」ボタンから追加してください</p>
            </div>
          )}
        </div>

        {/* 問題追加ボタン */}
        <button
          onClick={addQuestion}
          className="w-full border-2 border-dashed border-primary-300 text-primary-600 rounded-xl py-3 text-sm font-medium hover:border-primary-400 hover:bg-primary-50 transition"
        >
          ＋ 問題を追加
        </button>

        {/* クイズ保存ボタン */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <button
            onClick={saveQuiz}
            disabled={quizSaving || questions.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {quizSaving ? '保存中...' : 'クイズを保存'}
          </button>
          {questions.length === 0 && (
            <span className="text-xs text-gray-400">問題を1つ以上追加してください</span>
          )}
          {quizMsg && (
            <span
              className={`text-sm font-medium ${
                quizMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {quizMsg}
            </span>
          )}
        </div>
      </div>

      {/* プレビューリンク */}
      <div className="text-right">
        <a
          href={`/courses/${courseId}/lessons/${lesson.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700 transition underline underline-offset-2"
        >
          受講生プレビューで確認 →
        </a>
      </div>
    </div>
  );
}
