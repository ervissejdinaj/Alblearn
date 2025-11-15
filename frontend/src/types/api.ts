import { LessonStep } from "./index";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPaginatedMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface ApiPaginatedLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResource<T> {
  data: T[];
  meta: ApiPaginatedMeta;
  links: ApiPaginatedLinks;
}

export type ApiRole = "admin" | "instructor" | "student" | string;

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  roles: ApiRole[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
}

export interface Module {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description?: string | null;
  status: string;
  level?: string | null;
  price?: number | string | null;
  discount_price?: number | string | null;
  effective_price?: number | string | null;
  has_discount?: boolean;
  discount_percentage?: number | string | null;
  is_free?: boolean;
  thumbnail?: string | null;
  duration_hours?: number | null;
  lessons_count?: number | null;
  instructor_id?: string | null;
  instructor?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  tags?: string[] | null;
  requirements?: string[] | null;
  learning_outcomes?: string[] | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ModuleStatistics {
  total_enrollments: number;
  active_learners: number;
  completion_rate: number;
  average_progress: number;
  average_rating?: number | null;
  total_reviews?: number | null;
}

export interface ModuleEnrollment {
  id: string;
  user_id: string;
  module_id: string;
  progress: number | string | null;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  user?: ApiUser;
}

export interface ModuleQuiz {
  id: string;
  question: string;
  type: string;
  options?: string[] | null;
  explanation?: string | null;
  points?: number | null;
  order_number?: number | null;
  is_active?: boolean;
  section_id?: string | null;
  is_multiple_choice?: boolean;
  is_open_ended?: boolean;
  correct_answer?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleSection {
  id: string;
  title: string;
  content: string | null;
  description?: string | null;
  order_number?: number | null;
  points?: number | null;
  is_published?: boolean;
  module_id?: string | null;
  has_quizzes?: boolean;
  total_quiz_points?: number | null;
  created_at: string;
  updated_at: string;
  module?: Pick<Module, "id" | "title" | "slug">;
  quizzes?: ModuleQuiz[];
  lesson_steps?: LessonStep[];
  is_completed?: boolean;
  completed_at?: string | null;
}

export interface SectionProgress {
  section_id: string;
  is_completed: boolean;
  completed_at: string | null;
  quiz_progress?: {
    completed_quizzes: number;
    total_quizzes: number;
    score: number;
  };
  // Extended fields exposed by v5.1 progress endpoints
  lesson_steps_completed?: number;
  total_lesson_steps?: number;
  content_viewed?: boolean;
  content_viewed_at?: string | null;
  points_earned?: number;
  score?: number;
  can_access?: boolean;
}

export interface ModuleProgress {
  module_id: string;
  module_slug: string;
  enrollment_id?: string;
  progress_percentage: number;
  completed_sections: number;
  total_sections: number;
  sections: SectionProgress[];
  is_completed: boolean;
  completed_at: string | null;
}

export interface ActivityEntry {
  id: number;
  log_name: string;
  description: string | null;
  subject_type: string | null;
  event: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: Record<string, unknown> | null;
  batch_uuid: string | null;
  created_at: string;
  updated_at: string;
  subject?: Record<string, unknown> | null;
}

export interface ActivityStatistics {
  total: number;
  by_type: Record<string, number>;
  by_user: Record<string, number>;
  recent_activity: ActivityEntry[];
}

export interface UploadConfig {
  max_file_size: number;
  max_file_size_human: string;
  allowed_types: Record<string, string[]>;
}

export interface FileInfo {
  path: string;
  url: string;
  size: number;
  mime_type: string;
  last_modified: string;
}

export interface UploadResponse {
  path: string;
  url: string;
  disk: string;
  original_name?: string;
  size?: number;
  mime_type?: string;
}

export interface UploadMultipleResponse {
  files: UploadResponse[];
}

export interface HealthCheck {
  status: string;
  checks: Record<string, { status: string; message: string }>;
  timestamp: string;
  cache_stats?: Record<string, unknown>;
}

export type Course = Module;
export type CourseStatistics = ModuleStatistics;
export type CourseEnrollment = ModuleEnrollment;
