-- ============================================
-- コーチング学習サイト DB設計
-- Supabase (PostgreSQL) マイグレーション
-- ============================================

-- 1. profiles テーブル（ユーザー情報 + ロール管理）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. courses テーブル（講座）
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('coaching', 'counseling', 'mindset', 'general')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. course_sections テーブル（講座内のセクション）
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. lessons テーブル（レッスン）
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- コンテンツタイプ: video, text, work(ワーク)
  content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'text', 'work')),
  -- 動画URL（Vimeo/YouTube埋め込み用）
  video_url TEXT,
  -- テキスト教材（Markdown対応）
  text_content TEXT,
  -- レッスンの所要時間（分）
  duration_minutes INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. course_enrollments テーブル（受講登録）
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 将来のStripe連携用
  payment_status TEXT DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'trial')),
  stripe_payment_id TEXT,
  UNIQUE(user_id, course_id)
);

-- 6. lesson_progress テーブル（学習進捗）
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- 動画の視聴位置（秒）将来的に途中再開用
  last_position_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ============================================
-- 将来拡張用テーブル（コメント欄）
-- ============================================
-- CREATE TABLE lesson_comments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   content TEXT NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

-- ============================================
-- 将来拡張用テーブル（ワーク提出）
-- ============================================
-- CREATE TABLE work_submissions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   content TEXT,
--   file_url TEXT,
--   feedback TEXT,
--   status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'returned')),
--   submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   reviewed_at TIMESTAMPTZ
-- );

-- ============================================
-- インデックス
-- ============================================
CREATE INDEX idx_course_sections_course ON course_sections(course_id);
CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_progress_lesson ON lesson_progress(lesson_id);

-- ============================================
-- updated_at 自動更新トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated
  BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lessons_updated
  BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_progress_updated
  BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses visible to enrolled users"
  ON courses FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = courses.id
      AND course_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can do anything with courses"
  ON courses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- course_sections
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sections visible to enrolled users"
  ON course_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_sections.course_id
      AND course_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can do anything with sections"
  ON course_sections FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons visible to enrolled users"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN course_enrollments ce ON ce.course_id = cs.course_id
      WHERE cs.id = lessons.section_id
      AND ce.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can do anything with lessons"
  ON lessons FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- course_enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON course_enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON course_enrollments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- lesson_progress
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON lesson_progress FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 新規ユーザー登録時に profiles を自動作成
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- シードデータ（デモ用）
-- ============================================
INSERT INTO courses (id, title, description, thumbnail_url, category, is_published, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'セルフコーチング基礎講座', '自分自身をコーチングする技術を学ぶ基礎講座です。目標設定、質問力、行動計画の立て方を身につけましょう。', '/thumbnails/coaching-basic.jpg', 'coaching', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'マインドセット変革プログラム', '思考パターンを理解し、成長マインドセットを身につけるプログラムです。', '/thumbnails/mindset.jpg', 'mindset', true, 2),
  ('33333333-3333-3333-3333-333333333333', 'カウンセリング傾聴スキル講座', '相手の話を深く聴く力を養うカウンセリング技法の講座です。', '/thumbnails/counseling.jpg', 'counseling', true, 3);

INSERT INTO course_sections (id, course_id, title, description, sort_order) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'はじめに', 'コーチングの全体像を理解する', 1),
  ('aaaa1111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '目標設定の技術', '効果的な目標の立て方を学ぶ', 2),
  ('aaaa1111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '質問力を磨く', 'コーチングの核心である質問スキル', 3),
  ('aaaa2222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '思考パターンの理解', '自分の思考パターンを知る', 1),
  ('aaaa2222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '成長マインドセットの構築', 'マインドセットを変える方法', 2),
  ('aaaa3333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '傾聴の基本', '傾聴とは何かを理解する', 1),
  ('aaaa3333-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '実践ワーク', '傾聴スキルを実践で磨く', 2);

INSERT INTO lessons (id, section_id, title, description, content_type, video_url, text_content, duration_minutes, sort_order) VALUES
  ('bbbb0001-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'コーチングとは？', 'コーチングの定義と歴史を学びます', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 15, 1),
  ('bbbb0001-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'この講座の進め方', '講座の構成と学び方のガイド', 'text', NULL, '# この講座の進め方\n\nこの講座は全3セクションで構成されています。\n\n## 学習のポイント\n\n1. 動画を見たあと、必ず振り返りの時間を取りましょう\n2. テキスト教材はメモを取りながら読みましょう\n3. ワークは実際に手を動かして取り組みましょう\n\n## 推奨ペース\n\n1週間に1セクションのペースで進めることをお勧めします。', 5, 2),
  ('bbbb0001-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000002', 'SMARTゴール設定法', 'SMART目標の設定方法を動画で解説', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 20, 1),
  ('bbbb0001-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000002', '目標設定ワークシート', '実際に自分の目標を設定してみましょう', 'work', NULL, '# 目標設定ワーク\n\n以下の質問に答えて、あなたの目標を明確にしましょう。\n\n## ステップ1: 理想の状態\n3ヶ月後、どうなっていたいですか？\n\n## ステップ2: 具体化\nそれは具体的にどんな状態ですか？\n\n## ステップ3: 測定可能にする\nどうやって達成を測りますか？\n\n## ステップ4: アクション\n明日からできる小さな一歩は何ですか？', 30, 2),
  ('bbbb0001-0000-0000-0000-000000000005', 'aaaa1111-0000-0000-0000-000000000003', 'パワフルクエスチョンとは', '効果的な質問の種類と使い方', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 25, 1),
  ('bbbb0001-0000-0000-0000-000000000006', 'aaaa1111-0000-0000-0000-000000000003', '質問集テキスト', 'すぐに使えるコーチング質問集', 'text', NULL, '# コーチング質問集\n\n## 現状を把握する質問\n- 今、どんな気持ちですか？\n- 一番大切にしていることは何ですか？\n- 理想の状態を10点満点で表すと、今は何点ですか？\n\n## 未来を描く質問\n- 半年後、どうなっていたいですか？\n- 理想が叶ったとき、周りの人はどう言っていますか？\n- 何があれば前に進めますか？\n\n## 行動を促す質問\n- 今日からできる小さな一歩は何ですか？\n- 誰にサポートをお願いできますか？\n- いつまでにやりますか？', 10, 2),
  ('bbbb0002-0000-0000-0000-000000000001', 'aaaa2222-0000-0000-0000-000000000001', '固定マインドセットと成長マインドセット', '二つのマインドセットの違いを理解する', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 20, 1),
  ('bbbb0002-0000-0000-0000-000000000002', 'aaaa2222-0000-0000-0000-000000000002', '思考パターン書き換えワーク', '自分の思考パターンを変える実践ワーク', 'work', NULL, '# 思考パターン書き換えワーク\n\n## ステップ1\n最近「できない」と思ったことを3つ書いてください。\n\n## ステップ2\nそれぞれを「まだできない」に書き換えてください。\n\n## ステップ3\n「できるようになるために何ができるか」を考えてみましょう。', 25, 1),
  ('bbbb0003-0000-0000-0000-000000000001', 'aaaa3333-0000-0000-0000-000000000001', '傾聴の3つのレベル', '傾聴の基本スキルを動画で学ぶ', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', NULL, 18, 1),
  ('bbbb0003-0000-0000-0000-000000000002', 'aaaa3333-0000-0000-0000-000000000002', '傾聴ロールプレイ', 'ペアで実践する傾聴ワーク', 'work', NULL, '# 傾聴ロールプレイワーク\n\n## 準備\nパートナーを見つけて、話し手と聴き手を決めます。\n\n## ルール\n- 話し手：3分間、最近あった出来事を話す\n- 聴き手：相づち・うなずき・繰り返しだけで聴く\n- アドバイスや意見は言わない\n\n## 振り返り\n- 話し手：聴いてもらえた感覚はどうでしたか？\n- 聴き手：聴くことに集中してどう感じましたか？', 20, 1);
