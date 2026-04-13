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

// コンテンツタイプの選択肢
const CONTENT_TYPE_OPTIONS = [
  { value: 'video', label: '🎬 動画のみ', desc: '動画URLのみ表示' },
  { value: 'text', label: '📄 テキストのみ', desc: 'テキスト・Markdownのみ表示' },
  { value: 'video_text', label: '🎬📄 動画＋テキスト', desc: '動画URLとテキスト両方表示' },
  { value: 'work', label: '✏️ ワーク（課題）', desc: '課題テキストのみ表示' },
  { value: 'quiz', label: '🧠 クイズのみ', desc: '下でクイズを設定してください' },
];

// lessonのデータからdisplayTypeを判定
function resolveDisplayType(lesson: Lesson): string {
  if (lesson.content_type === 'work') return 'work';
  if (lesson.content_type === 'text') return 'text';
  if (lesson.content_type === 'quiz') return 'quiz';
  // videoタイプだが両方あれば video_text
  if (lesson.video_url && lesson.text_content) return 'video_text';
  return 'video';
}

// displayType → DBに保存するcontent_type
function toDbContentType(displayType: string): string {
  if (displayType === 'video_text') return 'video';
  return displayType;
}

export default function LessonEditor({ lesson, quiz, courseId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // レッスン基本情報
  const [lessonTitle, setLessonTitle] = useState(lesson.title);
  const [displayType, setDisplayType] = useState(resolveDisplayType(lesson));
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
  const [textContent, setTextContent] = useState(lesson.text_content || '');
  const [duration, setDuration] = useState(lesson.duration_minutes || 0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // クイズ表示トグル
  const [showQuiz, setShowQuiz] = useState(!!quiz);

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

  // ============================================================
  // レッスンコンテンツ保存
  // ============================================================
  const saveLesson = async () => {
    setSaving(true);
    setSaveMsg('');

    // displayTypeによって保存フィールドを制御
    const dbContentType = toDbContentType(displayType);
    const dbVideoUrl = (displayType === 'video' || displayType === 'video_text')
      ? (videoUrl.trim() || null)
      : null;
    const dbTextContent = (displayType === 'text' || displayType === 'work' || displayType === 'video_text')
      ? (textContent.trim() || null)
      : null;

    const { error } = await supabase
      .from('lessons')
      .update({
        title: lessonTitle.trim() || lesson.title,
        content_type: dbContentType,
        video_url: dbVideoUrl,
        text_content: dbTextContent,
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

  // ============================================================
  // クイズ問題の操作
  // ============================================================
  const addQuestion = () => {
    setQuestions(prev => [
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
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev =>
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

  // ============================================================
  // クイズ保存
  // ============================================================
  const saveQuiz = async () => {
    setQuizSaving(true);
    setQuizMsg('');

    try {
      let quizId = quiz?.id;

      if (!quizId) {
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

      // 既存の問題を削除して再作成
      if (quiz?.id) {
        await supabase.from('quiz_questions').delete().eq('quiz_id', quizId!);
      }

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

        const optionsToInsert = q.options
          .filter(o => o.option_text.trim())
          .map((o, j) => ({
            question_id: newQ.id,
            option_text: o.option_text,
            sort_order: j,
          }));
        if (optionsToInsert.length > 0) {
          const { error: oErr } = await supabase.from('quiz_options').insert(optionsToInsert);
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

  // ============================================================
  // クイズ削除
  // ============================================================
  const deleteQuiz = async () => {
    if (!quiz?.id) {
      setShowQuiz(false);
      setQuestions([]);
      return;
    }
    setQuizSaving(true);
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id);
    setQuizSaving(false);
    if (error) {
      setQuizMsg('削除に失敗しました: ' + error.message);
    } else {
      setShowQuiz(false);
      setQuestions([]);
      setQuizMsg('');
      router.refresh();
    }
  };

  // ============================================================
  // 表示制御
  // ============================================================
  const showVideoField = displayType === 'video' || displayType === 'video_text';
  const showTextField = displayType === 'text' || displayType === 'work' || displayType === 'video_text';
  const isQuizOnly = displayType === 'quiz';

  return (
    <div className="space-y-8">

      {/* ============================================================
          レッスン基本情報
      ============================================================ */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📝</span>
          <h2 className="text-lg font-bold text-gray-900">レッスン設定</h2>
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            レッスン名
          </label>
          <input
            type="text"
            value={lessonTitle}
            onChange={e => setLessonTitle(e.target.value)}
            placeholder="レッスン名を入力"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          />
        </div>

        {/* コンテンツタイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            コンテンツタイプ
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONTENT_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDisplayType(opt.value)}
                className={`px-3 py-2.5 rounded-xl border-2 text-left transition ${
                  displayType === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* クイズのみモード */}
        {isQuizOnly && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
            🧠 このレッスンはクイズのみです。下の「復習クイズ」セクションでクイズを設定してください。
          </div>
        )}

        {/* 動画URL */}
        {showVideoField && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              動画URL
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/... または https://vimeo.com/..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              YouTube埋め込みURL（youtube.com/embed/...）またはVimeo URLを入力
            </p>
          </div>
        )}

        {/* テキストコンテンツ */}
        {showTextField && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {displayType === 'work' ? 'ワーク・課題内容' : 'テキストコンテンツ'}
              <span className="ml-2 text-xs text-gray-400 font-normal">
                Markdown記法が使用できます
              </span>
            </label>
            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              rows={14}
              placeholder={'# 見出し\n\n本文テキスト\n\n## 小見出し\n\n- 箇条書き\n- 箇条書き'}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-y"
            />
          </div>
        )}

        {/* 所要時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所要時間（分）
          </label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
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
            <span className={`text-sm font-medium ${saveMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================
          クイズ設定
      ============================================================ */}
      <div className="card overflow-hidden">
        {/* クイズヘッダー（トグル） */}
        <div
          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => !quiz && setShowQuiz(!showQuiz)}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🧠</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">復習クイズ（4択）</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {quiz
                  ? `設定済み・${quiz.quiz_questions?.length || 0}問`
                  : showQuiz ? 'クイズを設定中' : 'クイズなし（クリックで追加）'
                }
              </p>
            </div>
            {quiz && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium border border-green-200">
                ✅ 設定済み
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!quiz && (
              <div className={`relative inline-flex items-center cursor-pointer`}>
                <div className={`w-10 h-5 rounded-full transition ${showQuiz ? 'bg-primary-500' : 'bg-gray-300'}`} />
                <div className={`absolute w-4 h-4 bg-white rounded-full shadow transition-all ${showQuiz ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} style={{ left: showQuiz ? '22px' : '2px' }} />
              </div>
            )}
          </div>
        </div>

        {/* クイズ本体 */}
        {showQuiz && (
          <div className="border-t border-gray-100 p-6 space-y-6">

            {/* クイズ設定 */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">クイズタイトル</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="確認テスト"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合格ライン（%）</label>
                <input
                  type="number"
                  value={passScore}
                  onChange={e => setPassScore(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">クイズの説明（任意）</label>
              <input
                type="text"
                value={quizDescription}
                onChange={e => setQuizDescription(e.target.value)}
                placeholder="このレッスンの内容を確認しましょう"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </div>

            {/* 問題一覧 */}
            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">問題 {qIdx + 1}</span>
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="text-xs text-red-500 hover:text-red-700 transition"
                    >
                      削除
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">問題文</label>
                    <textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)}
                      rows={2}
                      placeholder="問題文を入力してください"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
                    />
                  </div>

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
                            {['A', 'B', 'C', 'D'][oIdx]}
                          </button>
                          <input
                            type="text"
                            value={opt.option_text}
                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                            placeholder={`選択肢 ${['A', 'B', 'C', 'D'][oIdx]}`}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition ${
                              q.correct_option_index === oIdx
                                ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                                : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">✅ マークのついた選択肢が正解になります</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">解説（任意）</label>
                    <textarea
                      value={q.explanation}
                      onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)}
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

            {/* クイズ保存・削除ボタン */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-4">
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
                  <span className={`text-sm font-medium ${quizMsg.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                    {quizMsg}
                  </span>
                )}
              </div>
              <button
                onClick={deleteQuiz}
                disabled={quizSaving}
                className="text-xs text-red-400 hover:text-red-600 transition px-3 py-1.5 hover:bg-red-50 rounded-lg"
              >
                クイズを削除
              </button>
            </div>
          </div>
        )}
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
