-- ============================================
-- クイズ機能テーブル
-- ============================================

-- クイズ（レッスンごとに1つ）
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '確認テスト',
  description TEXT,
  pass_score INT NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id)
);

-- クイズの問題
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  correct_option_index INT NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
  explanation TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 選択肢（問題ごとに4つ）
CREATE TABLE public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- 受講生の回答記録
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS ポリシー
-- ============================================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- quizzes: 全認証ユーザーが閲覧可、管理者のみ編集
CREATE POLICY "quizzes_select" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quizzes_admin_insert" ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quizzes_admin_update" ON public.quizzes FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quizzes_admin_delete" ON public.quizzes FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- quiz_questions
CREATE POLICY "quiz_questions_select" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "quiz_questions_admin_insert" ON public.quiz_questions FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quiz_questions_admin_update" ON public.quiz_questions FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quiz_questions_admin_delete" ON public.quiz_questions FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- quiz_options
CREATE POLICY "quiz_options_select" ON public.quiz_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "quiz_options_admin_insert" ON public.quiz_options FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quiz_options_admin_update" ON public.quiz_options FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quiz_options_admin_delete" ON public.quiz_options FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- quiz_attempts: 自分のみ閲覧・作成、管理者は全て閲覧可
CREATE POLICY "quiz_attempts_select_own" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "quiz_attempts_insert_own" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_attempts_admin_delete" ON public.quiz_attempts FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================
-- lessons テーブルの管理者編集ポリシー追加
-- ============================================
CREATE POLICY "lessons_admin_insert" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "lessons_admin_update" ON public.lessons FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "lessons_admin_delete" ON public.lessons FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- courses テーブルの管理者編集ポリシー追加
CREATE POLICY "courses_admin_insert" ON public.courses FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "courses_admin_update" ON public.courses FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "courses_admin_delete" ON public.courses FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- course_sections テーブルの管理者編集ポリシー追加
CREATE POLICY "sections_admin_insert" ON public.course_sections FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "sections_admin_update" ON public.course_sections FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "sections_admin_delete" ON public.course_sections FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
