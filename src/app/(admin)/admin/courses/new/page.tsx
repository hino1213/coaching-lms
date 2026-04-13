'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const CATEGORY_OPTIONS = [
  { value: 'coaching', label: 'コーチング' },
  { value: 'counseling', label: 'カウンセリング' },
  { value: 'mindset', label: 'マインドセット' },
  { value: 'general', label: '一般' },
];

export default function NewCoursePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coaching');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('講座名を入力してください');
      return;
    }
    setSaving(true);
    setError('');

    // 既存の最大sort_orderを取得
    const { data: existing } = await supabase
      .from('courses')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxOrder = existing?.[0]?.sort_order ?? 0;

    const { data, error: insertError } = await supabase
      .from('courses')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        is_published: isPublished,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError('作成に失敗しました: ' + insertError.message);
      return;
    }

    router.push(`/admin/courses/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-sm text-gray-500">講座管理</p>
          <h1 className="text-2xl font-bold text-gray-900">新規講座を作成</h1>
        </div>
      </div>

      {/* フォーム */}
      <div className="card p-6 space-y-5">
        {/* 講座名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            講座名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例：ビジネスコーチング入門"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="この講座の内容・目的を入力してください"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition resize-none"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 公開設定 */}
        <div className="flex items-center gap-3 py-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
          <div>
            <p className="text-sm font-medium text-gray-700">公開する</p>
            <p className="text-xs text-gray-500">
              {isPublished ? '受講生に公開されます' : '非公開（後から変更できます）'}
            </p>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        {/* ボタン */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/courses"
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            キャンセル
          </Link>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '作成中...' : '講座を作成してセクションを追加 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
