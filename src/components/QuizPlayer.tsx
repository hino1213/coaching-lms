'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { QuizWithQuestions } from '@/lib/types/database';

interface Props {
  quiz: QuizWithQuestions;
  userId: string;
  previousAttempt?: {
    score: number;
    total_questions: number;
    passed: boolean;
    completed_at: string;
  } | null;
}

type Phase = 'intro' | 'answering' | 'result';

export default function QuizPlayer({ quiz, userId, previousAttempt }: Props) {
  const supabase = createClient();
  const questions = quiz.quiz_questions || [];

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const isLastQ = currentIndex === totalQ - 1;
  const selectedForCurrent = selectedAnswers[currentIndex];
  const hasAnswered = selectedForCurrent !== null;

  // ============================================
  // 回答を選択する
  // ============================================
  const selectAnswer = (optionIndex: number) => {
    if (hasAnswered) return; // 選択済みは変更不可
    const updated = [...selectedAnswers];
    updated[currentIndex] = optionIndex;
    setSelectedAnswers(updated);
    setShowExplanation(true);
  };

  // ============================================
  // 次の問題へ
  // ============================================
  const goNext = () => {
    setShowExplanation(false);
    if (!isLastQ) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  // ============================================
  // クイズ終了 → 採点・保存
  // ============================================
  const finishQuiz = async () => {
    const correctCount = selectedAnswers.reduce((acc: number, ans, i) => {
      return ans === questions[i].correct_option_index ? acc + 1 : acc;
    }, 0);

    const scorePercent = Math.round((correctCount / totalQ) * 100);
    const didPass = scorePercent >= quiz.pass_score;

    setScore(scorePercent);
    setPassed(didPass);
    setPhase('result');

    // 結果を保存
    setSaving(true);
    await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quiz_id: quiz.id,
      score: scorePercent,
      total_questions: totalQ,
      passed: didPass,
    });
    setSaving(false);
  };

  // ============================================
  // もう一度挑戦
  // ============================================
  const retry = () => {
    setPhase('answering');
    setCurrentIndex(0);
    setSelectedAnswers(Array(questions.length).fill(null));
    setShowExplanation(false);
  };

  // ============================================
  // イントロ画面
  // ============================================
  if (phase === 'intro') {
    return (
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
            🧠
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{quiz.title}</h3>
            {quiz.description && (
              <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>全{totalQ}問</span>
          <span>合格ライン: {quiz.pass_score}%</span>
        </div>

        {previousAttempt && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              previousAttempt.passed
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            前回のスコア: <strong>{previousAttempt.score}%</strong>{' '}
            {previousAttempt.passed ? '✅ 合格' : '再挑戦してみましょう！'}
          </div>
        )}

        <button
          onClick={() => setPhase('answering')}
          className="btn-primary w-full"
        >
          クイズを開始する
        </button>
      </div>
    );
  }

  // ============================================
  // 回答画面
  // ============================================
  if (phase === 'answering') {
    const opts = currentQ.quiz_options || [];
    const optLabels = ['A', 'B', 'C', 'D'];

    return (
      <div className="card p-6 space-y-5">
        {/* 進行状況 */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>問題 {currentIndex + 1} / {totalQ}</span>
            <span>🧠 {quiz.title}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題文 */}
        <p className="text-base font-bold text-gray-900 leading-relaxed">
          {currentQ.question_text}
        </p>

        {/* 選択肢 */}
        <div className="space-y-2">
          {opts.map((opt, oIdx) => {
            const isSelected = selectedForCurrent === oIdx;
            const isCorrect = oIdx === currentQ.correct_option_index;
            let btnClass =
              'w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition flex items-center gap-3';

            if (!hasAnswered) {
              btnClass += ' border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
            } else if (isCorrect) {
              btnClass += ' border-green-500 bg-green-50 text-green-800';
            } else if (isSelected) {
              btnClass += ' border-red-400 bg-red-50 text-red-700';
            } else {
              btnClass += ' border-gray-100 bg-gray-50 text-gray-400';
            }

            return (
              <button
                key={oIdx}
                onClick={() => selectAnswer(oIdx)}
                className={btnClass}
                disabled={hasAnswered}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    !hasAnswered
                      ? 'bg-gray-100 text-gray-600'
                      : isCorrect
                      ? 'bg-green-500 text-white'
                      : isSelected
                      ? 'bg-red-400 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {hasAnswered && isCorrect ? '✓' : hasAnswered && isSelected ? '✗' : optLabels[oIdx]}
                </span>
                <span>{opt.option_text}</span>
              </button>
            );
          })}
        </div>

        {/* 解説 */}
        {showExplanation && currentQ.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
            <span className="font-bold">💡 解説: </span>
            {currentQ.explanation}
          </div>
        )}

        {/* 正誤表示 */}
        {hasAnswered && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              selectedForCurrent === currentQ.correct_option_index
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {selectedForCurrent === currentQ.correct_option_index ? (
              <>✅ 正解です！</>
            ) : (
              <>
                ❌ 不正解です。正解は{' '}
                <strong>
                  {optLabels[currentQ.correct_option_index]}:{' '}
                  {opts[currentQ.correct_option_index]?.option_text}
                </strong>
              </>
            )}
          </div>
        )}

        {/* 次へボタン */}
        {hasAnswered && (
          <button onClick={goNext} className="btn-primary w-full">
            {isLastQ ? '結果を見る' : '次の問題へ →'}
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // 結果画面
  // ============================================
  const correctCount = selectedAnswers.filter(
    (ans, i) => ans === questions[i].correct_option_index
  ).length;

  return (
    <div className="card p-6 space-y-5 text-center">
      <div className="text-5xl">{passed ? '🎉' : '😊'}</div>

      <div>
        <h3 className="text-xl font-bold text-gray-900">
          {passed ? 'おめでとうございます！' : 'もう少し！'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{quiz.title} の結果</p>
      </div>

      <div className="flex items-center justify-center gap-8 py-4">
        <div>
          <p className="text-4xl font-bold text-indigo-600">{score}%</p>
          <p className="text-sm text-gray-400 mt-1">スコア</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-700">
            {correctCount} / {totalQ}
          </p>
          <p className="text-sm text-gray-400 mt-1">正解数</p>
        </div>
      </div>

      <div
        className={`rounded-xl py-3 px-4 text-sm font-medium ${
          passed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        }`}
      >
        {passed
          ? `✅ 合格！（合格ライン: ${quiz.pass_score}%）`
          : `合格ライン ${quiz.pass_score}% まであと ${quiz.pass_score - score}% です`}
      </div>

      {saving && (
        <p className="text-sm text-gray-400">結果を保存中...</p>
      )}

      {/* 問題の振り返り */}
      <div className="text-left space-y-3 border-t border-gray-100 pt-4">
        <p className="text-sm font-bold text-gray-700">振り返り</p>
        {questions.map((q, i) => {
          const isCorrect = selectedAnswers[i] === q.correct_option_index;
          return (
            <div key={q.id} className="flex items-start gap-2 text-sm">
              <span className={isCorrect ? 'text-green-500' : 'text-red-400'}>
                {isCorrect ? '✅' : '❌'}
              </span>
              <span className="text-gray-700">{q.question_text}</span>
            </div>
          );
        })}
      </div>

      <button onClick={retry} className="btn-secondary w-full">
        もう一度挑戦する
      </button>
    </div>
  );
}
