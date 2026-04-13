import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Lesson } from '@/lib/types/database';
import CourseDetailClient from './CourseDetailClient';

interface Props {
  params: { courseId: string };
}

export default async function AdminCourseDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.courseId)
    .single();

  if (!course) notFound();

  const { data: sections } = await supabase
    .from('course_sections')
    .select(`
      *,
      lessons (*)
    `)
    .eq('course_id', params.courseId)
    .order('sort_order', { ascending: true });

  const sortedSections = (sections || []).map((section: any) => ({
    ...section,
    lessons: (section.lessons || []).sort(
      (a: Lesson, b: Lesson) => a.sort_order - b.sort_order
    ),
  }));

  return <CourseDetailClient course={course} sections={sortedSections} />;
}
