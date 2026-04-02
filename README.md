# コーチング学習サイト (Coaching LMS)

コーチング・カウンセリング・マインドセット系講座の受講生向け学習プラットフォームです。

## 技術構成

- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド/DB**: Supabase (PostgreSQL + Auth + RLS)
- **動画**: YouTube / Vimeo 外部埋め込み対応

## 主な機能

### 受講生向け
- メール/パスワードによるログイン
- ダッシュボード（受講中講座一覧 + 進捗率）
- 講座詳細ページ（セクション/レッスン一覧）
- レッスンページ（動画再生、テキスト教材、ワーク）
- 視聴済みチェック機能
- 「次のレッスンへ進む」ナビゲーション
- レスポンシブ対応（モバイルファースト）

### 管理者向け
- 管理者ダッシュボード（統計情報、学習停滞者の検知）
- 受講生一覧（進捗率、最終ログイン、状態表示）
- 受講生詳細（講座ごとのレッスン完了状況、学習履歴）

## 初期セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
cd coaching-lms
npm install
```

### 2. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスし、新しいプロジェクトを作成
2. プロジェクトの Settings > API から以下を取得:
   - Project URL
   - anon/public API Key

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集し、Supabaseの情報を入力:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. データベースのセットアップ

Supabase Dashboard の SQL Editor で `supabase/migrations/001_initial_schema.sql` の内容を実行します。

これにより以下が作成されます:
- テーブル: profiles, courses, course_sections, lessons, course_enrollments, lesson_progress
- RLS（Row Level Security）ポリシー
- トリガー（updated_at自動更新、新規ユーザー時のprofile自動作成）
- デモ用のシードデータ（3つのサンプル講座）

### 5. 管理者アカウントの作成

Supabase Dashboard の Authentication > Users から:

1. 「Add user」で管理者アカウントを作成
2. SQL Editor で以下を実行してロールを admin に変更:

```sql
UPDATE profiles SET role = 'admin', full_name = '管理者名' WHERE email = 'admin@example.com';
```

### 6. テスト用受講生アカウントの作成

1. Supabase Dashboard の Authentication > Users から受講生アカウントを作成
2. SQL Editor で講座への受講登録を行う:

```sql
-- 受講生のIDを確認
SELECT id, email FROM profiles WHERE role = 'student';

-- 講座に登録（user_idは上で確認したIDに置き換え）
INSERT INTO course_enrollments (user_id, course_id) VALUES
  ('受講生のUUID', '11111111-1111-1111-1111-111111111111'),
  ('受講生のUUID', '22222222-2222-2222-2222-222222222222'),
  ('受講生のUUID', '33333333-3333-3333-3333-333333333333');
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてログイン

## DB設計（テーブル構成）

| テーブル | 説明 |
|---------|------|
| `profiles` | ユーザー情報（role: admin/student） |
| `courses` | 講座（タイトル、説明、カテゴリ、サムネイル） |
| `course_sections` | 講座内のセクション |
| `lessons` | レッスン（動画/テキスト/ワーク） |
| `course_enrollments` | 受講登録（ユーザーと講座の紐付け） |
| `lesson_progress` | 学習進捗（視聴済みフラグ） |

## RLS (Row Level Security) 設計

- 受講生は自分が登録されている講座のみ閲覧可能
- 受講生は自分の進捗のみ読み書き可能
- 管理者は全データの読み書きが可能
- 新規ユーザー登録時に profiles レコードが自動作成

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/login/           # ログイン画面
│   ├── (student)/              # 受講生向けレイアウト
│   │   ├── dashboard/          # ダッシュボード
│   │   └── courses/
│   │       ├── [courseId]/      # 講座詳細
│   │       └── [courseId]/lessons/[lessonId]/  # レッスン詳細
│   ├── (admin)/admin/          # 管理者向けレイアウト
│   │   ├── dashboard/          # 管理者ダッシュボード
│   │   └── students/           # 受講生管理
│   └── layout.tsx
├── components/                 # 共通コンポーネント
├── lib/
│   ├── supabase/               # Supabaseクライアント
│   └── types/                  # TypeScript型定義
├── middleware.ts               # 認証ミドルウェア
└── supabase/
    └── migrations/             # SQLマイグレーション
```

## 今後の拡張案

### Phase 2: コンテンツ管理
- [ ] 管理画面での講座・レッスンのCRUD操作
- [ ] 画像アップロード（サムネイル）
- [ ] リッチテキストエディタ（教材作成用）

### Phase 3: 決済連携
- [ ] Stripe連携（講座の有料販売）
- [ ] 決済完了時の自動受講登録
- [ ] サブスクリプション対応

### Phase 4: コミュニケーション
- [ ] レッスンへのコメント機能
- [ ] 受講生同士のディスカッション
- [ ] 管理者からのお知らせ機能

### Phase 5: ワーク・提出
- [ ] ワーク提出機能（テキスト/ファイル）
- [ ] 管理者によるフィードバック
- [ ] 提出状況の管理画面

### Phase 6: 分析・通知
- [ ] 学習データの分析ダッシュボード
- [ ] メール通知（学習リマインダー）
- [ ] 修了証の発行

## デプロイ

Vercel へのデプロイを推奨します:

1. GitHub にプッシュ
2. [Vercel](https://vercel.com) でリポジトリをインポート
3. 環境変数を設定
4. デプロイ

## ライセンス

Private
