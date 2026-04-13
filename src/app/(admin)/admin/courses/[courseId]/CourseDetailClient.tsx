'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  video_url: string | null;
  text_content: string | null;
  duration_minutes: number;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_published: boolean;
}

interface Props {
  course: Course;
  sections: Section[];
}

const CONTENT_TYPE_OPTIONS = [
  { value: 'video', label: '🎬 動画のみ' },
  { value: 'text', label: '📄 テキストのみ' },
  { value: 'video_text', label: '🎬📄 動画＋テキスト' },
  { value: 'work', label: '✏️ ワーク（課題）' },
];

const CATEGORY_OPTIONS = [
  { value: 'coaching', label: 'コーチング' },
  { value: 'counseling', label: 'カウンセリング' },
  { value: 'mindset', label: 'マインドセット' },
  { value: 'general', label: '一般' },
];

function getContentTypeLabel(lesson: Lesson): string {
  if (lesson.content_type === 'work') return '✏️ ワーク';
  if (lesson.video_url && lesson.text_content) return '🎬📄 動画+テキスト';
  if (lesson.video_url) return '🎬 動画';
  if (lesson.text_content) return '📄 テキスト';
  return lesson.content_type;
}

export default function CourseDetailClient({ course, sections: initialSections }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ---- 汎用状態 ----
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'section' | 'lesson';
    id: string;
    name: string;
  } | null>(null);

  // ---- 講座編集 ----
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseEdit, setCourseEdit] = useState({
    title: course.title,
    description: course.description || '',
    category: course.category,
    is_published: course.is_published,
  });

  // ---- セクション ----
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSection, setNewSection] = useState({ title: '', description: '' });
  const [editingSection, setEditingSection] = useState<{
    id: string; title: string; description: string;
  } | null>(null);

  // ---- レッスン追加 ----
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: '',
    content_type: 'video',
    duration_minutes: 15,
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================================
  // 講座の保存
  // ============================================================
  const saveCourse = async () => {
    if (!courseEdit.title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('courses')
      .update({
        title: courseEdit.title.trim(),
        description: courseEdit.description.trim() || null,
        category: courseEdit.category,
        is_published: courseEdit.is_published,
      })
      .eq('id', course.id);
    setSaving(false);
    if (error) {
      showToast('❌ 保存に失敗しました', false);
    } else {
      setIsEditingCourse(false);
      showToast('✅ 講座情報を保存しました');
      router.refresh();
    }
  };

  // ============================================================
  // セクションの追加
  // ============================================================
  const addSection = async () => {
    if (!newSection.title.trim()) return;
    setSaving(true);
    const maxOrder = sections.length > 0
      ? Math.max(...sections.map(s => s.sort_order))
      : 0;
    const { data, error } = await supabase
      .from('course_sections')
      .insert({
        course_id: course.id,
        title: newSection.title.trim(),
        description: newSection.description.trim() || null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      showToast('❌ セクション追加に失敗しました', false);
    } else {
      setSections([...sections, { ...data, lessons: [] }]);
      setNewSection({ title: '', description: '' });
      setIsAddingSection(false);
      showToast('✅ セクションを追加しました');
    }
  };

  // ============================================================
  // セクションの編集
  // ============================================================
  const saveSection = async () => {
    if (!editingSection || !editingSection.title.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('course_sections')
      .update({
        title: editingSection.title.trim(),
        description: editingSection.description.trim() || null,
      })
      .eq('id', editingSection.id);
    setSaving(false);
    if (error) {
      showToast('❌ 保存に失敗しました', false);
    } else {
      setSections(sections.map(s =>
        s.id === editingSection.id
          ? { ...s, title: editingSection.title, description: editingSection.description || null }
          : s
      ));
      setEditingSection(null);
      showToast('✅ セクションを更新しました');
    }
  };

  // ============================================================
  // セクションの削除
  // ============================================================
  const deleteSection = async (sectionId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', sectionId);
    setSaving(false);
    if (error) {
      showToast('❌ 削除に失敗しました', false);
    } else {
      setSections(sections.filter(s => s.id !== sectionId));
      setConfirmDelete(null);
      showToast('✅ セクションを削除しました');
    }
  };

  // ============================================================
  // レッスンの追加
  // ============================================================
  const addLesson = async (sectionId: string) => {
    if (!newLesson.title.trim()) return;
    setSaving(true);
    const section = sections.find(s => s.id === sectionId);
    const maxOrder = section && section.lessons.length > 0
      ? Math.max(...section.lessons.map(l => l.sort_order))
      : 0;

    // content_type の正規化（video_text → video として保存）
    const contentType = newLesson.content_type === 'video_text' ? 'video' : newLesson.content_type;

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        section_id: sectionId,
        title: newLesson.title.trim(),
        content_type: contentType,
        duration_minutes: newLesson.duration_minutes,
        sort_order: maxOrder + 1,
        is_preview: false,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      showToast('❌ レッスン追加に失敗しました', false);
    } else {
      setSections(sections.map(s =>
        s.id === sectionId
          ? { ...s, lessons: [...s.lessons, data] }
          : s
      ));
      setAddingLessonToSection(null);
      setNewLesson({ title: '', content_type: 'video', duration_minutes: 15 });
      showToast('✅ レッスンを追加しました');
    }
  };

  // ============================================================
  // レッスンの削除
  // ============================================================
  const deleteLesson = async (lessonId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);
    setSaving(false);
    if (error) {
      showToast('❌ 削除に失敗しました', false);
    } else {
      setSections(sections.map(s => ({
        ...s,
        lessons: s.lessons.filter(l => l.id !== lessonId),
      })));
      setConfirmDelete(null);
      showToast('✅ レッスンを削除しました');
    }
  };

  // ============================================================
  // レンダー
  // ============================================================
  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">削除の確認</h3>
              <p className="text-sm text-gray-500">
                「<span className="font-medium text-gray-800">{confirmDelete.name}</span>」を削除しますか？
                <br />この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'section') deleteSection(confirmDelete.id);
                  else deleteLesson(confirmDelete.id);
                }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-500 rounded-xl text-sm font-medium text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {saving ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ヘッダー（講座情報） ========== */}
      <div className="flex items-start gap-4">
        <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600 mt-1 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex-1">
          {isEditingCourse ? (
            <div className="card p-5 space-y-4 border-2 border-primary-200">
              <p className="text-sm font-bold text-primary-700">📝 講座情報を編集</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">講座名 <span className="text-red-500">*</span></label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                  value={courseEdit.title}
                  onChange={e => setCourseEdit({ ...courseEdit, title: e.target.value })}
                  placeholder="講座名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                  rows={3}
                  value={courseEdit.description}
                  onChange={e => setCourseEdit({ ...courseEdit, description: e.target.value })}
                  placeholder="講座の説明"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 outline-none"
                    value={courseEdit.category}
                    onChange={e => setCourseEdit({ ...courseEdit, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={courseEdit.is_published}
                    onChange={e => setCourseEdit({ ...courseEdit, is_published: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span>公開する</span>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setIsEditingCourse(false); setCourseEdit({ title: course.title, description: course.description || '', category: course.category, is_published: course.is_published }); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveCourse}
                  disabled={saving || !courseEdit.title.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">講座管理</p>
                <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                {course.description && (
                  <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {course.is_published ? '公開中' : '非公開'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditingCourse(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                講座を編集
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========== セクション一覧 ========== */}
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="card overflow-hidden">

            {/* セクションヘッダー */}
            {editingSection?.id === section.id ? (
              <div className="bg-primary-50 px-5 py-4 border-b border-primary-100 space-y-2">
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                  value={editingSection.title}
                  onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                  placeholder="セクション名"
                />
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                  value={editingSection.description}
                  onChange={e => setEditingSection({ ...editingSection, description: e.target.value })}
                  placeholder="説明（任意）"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingSection(null)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveSection}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-gray-800">{section.title}</h2>
                  {section.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingSection({ id: section.id, title: section.title, description: section.description || '' })}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                    title="セクションを編集"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'section', id: section.id, name: section.title })}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="セクションを削除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* レッスン一覧 */}
            <div className="divide-y divide-gray-100">
              {section.lessons.length === 0 && addingLessonToSection !== section.id && (
                <p className="px-5 py-4 text-sm text-gray-400">レッスンがありません</p>
              )}

              {section.lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition group">
                  <Link
                    href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <span className="text-sm shrink-0 text-gray-600">{getContentTypeLabel(lesson)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{lesson.title}</p>
                      {lesson.duration_minutes > 0 && (
                        <span className="text-xs text-gray-400">{lesson.duration_minutes}分</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <Link
                      href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                      className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-lg hover:bg-primary-100 transition"
                    >
                      コンテンツ編集
                    </Link>
                    <button
                      onClick={() => setConfirmDelete({ type: 'lesson', id: lesson.id, name: lesson.title })}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                      title="レッスンを削除"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* レッスン追加フォーム */}
              {addingLessonToSection === section.id ? (
                <div className="px-5 py-4 bg-blue-50 border-t border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-3">＋ 新しいレッスンを追加</p>
                  <div className="space-y-3">
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="レッスン名（必須）"
                      value={newLesson.title}
                      onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">コンテンツタイプ</label>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
                          value={newLesson.content_type}
                          onChange={e => setNewLesson({ ...newLesson, content_type: e.target.value })}
                        >
                          {CONTENT_TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-gray-500 mb-1">所要時間（分）</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
                          value={newLesson.duration_minutes}
                          onChange={e => setNewLesson({ ...newLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 bg-blue-100 rounded-lg px-3 py-2">
                      💡 クイズは後からレッスン編集画面で追加できます
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAddingLessonToSection(null);
                          setNewLesson({ title: '', content_type: 'video', duration_minutes: 15 });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => addLesson(section.id)}
                        disabled={saving || !newLesson.title.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {saving ? '追加中...' : 'レッスンを追加'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingLessonToSection(section.id);
                    setNewLesson({ title: '', content_type: 'video', duration_minutes: 15 });
                  }}
                  className="w-full px-5 py-3 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  レッスンを追加
                </button>
              )}
            </div>
          </div>
        ))}

        {/* セクション追加 */}
        {isAddingSection ? (
          <div className="card p-5 border-2 border-primary-200 bg-primary-50/30">
            <p className="text-sm font-bold text-gray-800 mb-3">＋ 新しいセクションを追加</p>
            <div className="space-y-3">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="セクション名（必須）"
                value={newSection.title}
                onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                autoFocus
              />
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="説明（任意）"
                value={newSection.description}
                onChange={e => setNewSection({ ...newSection, description: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsAddingSection(false); setNewSection({ title: '', description: '' }); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={addSection}
                  disabled={saving || !newSection.title.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? '追加中...' : 'セクションを追加'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingSection(true)}
            className="w-full card p-4 border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center gap-2 text-sm transition rounded-xl"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            セクションを追加
          </button>
        )}

        {sections.length === 0 && !isAddingSection && (
          <p className="text-center text-sm text-gray-400 py-4">
            まだセクションがありません。「セクションを追加」から始めましょう。
          </p>
        )}
      </div>
    </div>
  );
}
