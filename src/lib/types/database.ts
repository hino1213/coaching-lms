export type UserRole = 'admin' | 'student';
export type ContentType = 'video' | 'text' | 'work' | 'quiz';
export type CourseCategory = 'coaching' | 'counseling' | 'mindset' | 'general';
export type PaymentStatus = 'free' | 'paid' | 'trial';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: CourseCategory;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  video_url: string | null;
  text_content: string | null;
  duration_minutes: number;
  sort_order: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  payment_status: PaymentStatus;
  stripe_payment_id: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  last_position_seconds: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// クイズ関連
// ============================================

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  pass_score: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  correct_option_index: number;
  explanation: string | null;
  sort_order: number;
  created_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  passed: boolean;
  completed_at: string;
}

// 拡張型（JOIN結果用）
export interface QuizWithQuestions extends Quiz {
  quiz_questions: QuizQuestionWithOptions[];
}

export interface QuizQuestionWithOptions extends QuizQuestion {
  quiz_options: QuizOption[];
}

// ============================================
// 拡張型（JOIN結果用）
// ============================================

export interface CourseWithProgress extends Course {
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
}

export interface SectionWithLessons extends CourseSection {
  lessons: LessonWithProgress[];
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress | null;
}

// 管理者画面用
export interface StudentOverview {
  id: string;
  email: string;
  full_name: string;
  last_login_at: string | null;
  enrolled_courses: {
    course_id: string;
    course_title: string;
    progress_percent: number;
    last_lesson_title: string | null;
    last_activity_at: string | null;
  }[];
}
