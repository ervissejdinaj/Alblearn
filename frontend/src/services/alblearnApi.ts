import {
  request,
  API_ROOT_URL,
  RequestOptions,
  RequestParams,
  ApiError,
} from "./apiClient";
import {
  ApiResponse,
  PaginatedResource,
  ApiUser,
  AuthResponse,
  Module,
  ModuleStatistics,
  ModuleEnrollment,
  ModuleSection,
  ModuleQuiz,
  ActivityEntry,
  ActivityStatistics,
  UploadConfig,
  FileInfo,
  UploadResponse,
  UploadMultipleResponse,
  HealthCheck,
  ModuleProgress,
  SectionProgress,
} from "../types/api";
import { LessonStep } from "../types";

const createEmptyPaginatedResource = <T>(): PaginatedResource<T> => ({
  data: [],
  meta: {
    total: 0,
    per_page: 0,
    current_page: 1,
    last_page: 1,
    from: null,
    to: null,
  },
  links: {
    first: null,
    last: null,
    prev: null,
    next: null,
  },
});

const createEmptyResponse = <T>(
  data: T,
  message = "Resource not available"
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

const withNotFoundFallback = async <T>(
  promise: Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return fallback;
    }
    throw error;
  }
};

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
}

export interface AssignRolePayload {
  role: string;
}

export interface RemoveRolePayload {
  role: string;
}

export interface CreateInstructorPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ListUsersParams extends RequestParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
  search?: string;
}

export interface ListModulesParams extends RequestParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  instructor_id?: string;
}

export interface SearchModulesParams extends RequestParams {
  q: string;
  per_page?: number;
}

export interface EnrollmentsParams extends RequestParams {
  page?: number;
  per_page?: number;
}

export interface ListActivitiesParams extends RequestParams {
  page?: number;
  per_page?: number;
  log_name?: string;
  event?: string;
}

export interface CleanupActivitiesPayload {
  days: number;
}

export interface DeleteFilePayload {
  path: string;
}

const post = <T>(
  path: string,
  body: unknown,
  options?: Partial<RequestOptions>
) => request<T>(path, { method: "POST", body, ...options });

const put = <T>(
  path: string,
  body: unknown,
  options?: Partial<RequestOptions>
) => request<T>(path, { method: "PUT", body, ...options });

const del = <T>(
  path: string,
  body?: unknown,
  options?: Partial<RequestOptions>
) => request<T>(path, { method: "DELETE", body, ...options });

export const healthApi = () =>
  request<ApiResponse<HealthCheck>>("/health", { baseUrl: API_ROOT_URL });

export const authApi = {
  register: (payload: RegisterPayload) =>
    post<ApiResponse<AuthResponse>>("/auth/register", payload, { auth: false }),
  login: (payload: LoginPayload) =>
    post<ApiResponse<AuthResponse>>("/auth/login", payload, { auth: false }),
  me: () => request<ApiResponse<ApiUser>>("/auth/user"),
  logout: () => post<ApiResponse<Record<string, unknown>>>("/auth/logout", {}),
  forgotPassword: (payload: ForgotPasswordPayload) =>
    post<ApiResponse<Record<string, unknown>>>(
      "/auth/forgot-password",
      payload,
      {
        auth: false,
      }
    ),
  resetPassword: (payload: ResetPasswordPayload) =>
    post<ApiResponse<Record<string, unknown>>>(
      "/auth/reset-password",
      payload,
      {
        auth: false,
      }
    ),
};

export const userApi = {
  list: (params?: ListUsersParams) =>
    request<ApiResponse<PaginatedResource<ApiUser>>>("/users", { params }),
  create: (payload: CreateUserPayload) =>
    post<ApiResponse<ApiUser>>("/users", payload),
  createInstructor: (payload: CreateInstructorPayload) =>
    post<ApiResponse<ApiUser>>("/instructors", payload),
  getById: (userId: string | number) =>
    request<ApiResponse<ApiUser>>(`/users/${userId}`),
  update: (userId: string | number, payload: UpdateUserPayload) =>
    put<ApiResponse<ApiUser>>(`/users/${userId}`, payload),
  assignRole: (userId: string | number, payload: AssignRolePayload) =>
    post<ApiResponse<ApiUser | Record<string, unknown>>>(
      `/users/${userId}/roles`,
      payload
    ),
  roles: (userId: string | number) =>
    request<ApiResponse<{ roles: string[] }>>(`/users/${userId}/roles`),
  removeRole: (userId: string | number, payload: RemoveRolePayload) =>
    del<ApiResponse<Record<string, unknown>>>(
      `/users/${userId}/roles`,
      payload
    ),
  removeRoleByName: (userId: string | number, role: string) =>
    del<ApiResponse<Record<string, unknown>>>(`/users/${userId}/roles/${role}`),
  remove: (userId: string | number) =>
    del<ApiResponse<Record<string, unknown>>>(`/users/${userId}`),
};

export const moduleApi = {
  listPublished: (params?: ListModulesParams) =>
    request<ApiResponse<PaginatedResource<Module>>>("/modules/published", {
      params,
    }),
  search: (params: SearchModulesParams) =>
    request<ApiResponse<PaginatedResource<Module>>>("/modules/search", {
      params,
    }),
  featured: (limit?: number) =>
    request<ApiResponse<Module[]>>("/modules/featured", {
      params: limit ? { limit } : undefined,
    }),
  findByTags: (payload: { tags: string[]; per_page?: number }) =>
    post<ApiResponse<PaginatedResource<Module>>>(
      "/modules/find-by-tags",
      payload
    ),
  listAccessible: (params?: RequestParams) =>
    request<ApiResponse<PaginatedResource<Module>>>("/modules/accessible", {
      params,
    }),
  listLocked: (params?: RequestParams) =>
    request<ApiResponse<PaginatedResource<Module>>>("/modules/locked", {
      params,
    }),
  learningPath: () => request<ApiResponse<Module[]>>("/learning-path"),
  list: (params?: ListModulesParams) =>
    request<ApiResponse<PaginatedResource<Module>>>("/modules", { params }),
  create: (payload: Partial<Module>) =>
    post<ApiResponse<Module>>("/modules", payload),
  getBySlug: (slug: string) => request<ApiResponse<Module>>(`/modules/${slug}`),
  update: (slug: string, payload: Partial<Module>) =>
    put<ApiResponse<Module>>(`/modules/${slug}`, payload),
  remove: (slug: string) =>
    del<ApiResponse<Record<string, unknown>>>(`/modules/${slug}`),
  enroll: (slug: string) =>
    post<ApiResponse<ModuleEnrollment>>(`/modules/${slug}/enroll`, {}),
  enrollments: (slug: string, params?: EnrollmentsParams) =>
    request<ApiResponse<PaginatedResource<ModuleEnrollment>>>(
      `/modules/${slug}/enrollments`,
      { params }
    ),
  statistics: (slug: string) =>
    request<ApiResponse<ModuleStatistics>>(`/modules/${slug}/statistics`),
  assignInstructor: (slug: string, instructorId: string | null) =>
    request<ApiResponse<Module>>(`/modules/${slug}/assign-instructor`, {
      method: "PUT",
      body: { instructor_id: instructorId },
    }),
};

export interface ListSectionsParams extends RequestParams {
  published_only?: boolean;
  per_page?: number;
}

export interface UpsertSectionPayload {
  title: string;
  description?: string;
  content?: string;
  order_number?: number | null;
  points?: number | null;
  is_published?: boolean;
  lesson_steps?: LessonStep[];
}

export const sectionApi = {
  list: (moduleSlug: string, params?: ListSectionsParams) =>
    request<ApiResponse<ModuleSection[]>>(`/modules/${moduleSlug}/sections`, {
      params,
    }),
  get: (moduleSlug: string, sectionId: string | number) =>
    request<ApiResponse<ModuleSection>>(
      `/modules/${moduleSlug}/sections/${sectionId}`
    ),
  create: (moduleSlug: string, payload: UpsertSectionPayload) =>
    post<ApiResponse<ModuleSection>>(
      `/modules/${moduleSlug}/sections`,
      payload
    ),
  update: (
    moduleSlug: string,
    sectionId: string | number,
    payload: UpsertSectionPayload
  ) =>
    put<ApiResponse<ModuleSection>>(
      `/modules/${moduleSlug}/sections/${sectionId}`,
      payload
    ),
  remove: (moduleSlug: string, sectionId: string | number) =>
    del<ApiResponse<Record<string, unknown>>>(
      `/modules/${moduleSlug}/sections/${sectionId}`
    ),
  markComplete: (sectionId: string | number) =>
    post<ApiResponse<Record<string, unknown>>>(
      `/sections/${sectionId}/complete`,
      {}
    ),
  progress: (sectionId: string | number) =>
    request<ApiResponse<SectionProgress>>(`/sections/${sectionId}/progress`),
};

export interface QuizSubmissionPayload {
  user_answer: string;
}

export const quizApi = {
  list: (params?: RequestParams) =>
    request<ApiResponse<PaginatedResource<ModuleQuiz>>>("/quizzes", {
      params,
    }),
  listForSection: (
    sectionId: string | number,
    params?: { published_only?: boolean; per_page?: number }
  ) =>
    request<ApiResponse<ModuleQuiz[]>>(`/sections/${sectionId}/quizzes`, {
      params,
    }),
  listForSectionPaginated: (
    sectionId: string | number,
    params?: { published_only?: boolean; per_page?: number; page?: number }
  ) =>
    request<ApiResponse<PaginatedResource<ModuleQuiz>>>(
      `/sections/${sectionId}/quizzes/paginated`,
      { params }
    ),
  create: (payload: Partial<ModuleQuiz>) =>
    post<ApiResponse<ModuleQuiz>>("/quizzes", payload),
  get: (quizId: string | number) =>
    request<ApiResponse<ModuleQuiz>>(`/quizzes/${quizId}`),
  update: (quizId: string | number, payload: Partial<ModuleQuiz>) =>
    put<ApiResponse<ModuleQuiz>>(`/quizzes/${quizId}`, payload),
  remove: (quizId: string | number) =>
    del<ApiResponse<Record<string, unknown>>>(`/quizzes/${quizId}`),
  submit: (quizId: string | number, payload: QuizSubmissionPayload) =>
    post<ApiResponse<Record<string, unknown>>>(
      `/quizzes/${quizId}/submit`,
      payload
    ),
  attempts: (quizId: string | number, params?: RequestParams) =>
    request<ApiResponse<PaginatedResource<Record<string, unknown>>>>(
      `/quizzes/${quizId}/attempts`,
      { params }
    ),
  sectionStatistics: (sectionId: string | number, params?: RequestParams) =>
    request<ApiResponse<Record<string, unknown>>>(
      `/sections/${sectionId}/quiz-stats`,
      { params }
    ),
  sectionProgress: (sectionId: string | number, params?: RequestParams) =>
    request<ApiResponse<Record<string, unknown>>>(
      `/sections/${sectionId}/quiz-progress`,
      { params }
    ),
};

export const fileApi = {
  upload: (formData: FormData) =>
    post<ApiResponse<UploadResponse>>("/files/upload", formData, {
      isFormData: true,
    }),
  uploadMultiple: (formData: FormData) =>
    post<ApiResponse<UploadMultipleResponse>>(
      "/files/upload-multiple",
      formData,
      {
        isFormData: true,
      }
    ),
  uploadAvatar: (formData: FormData) =>
    post<ApiResponse<UploadResponse>>("/files/upload-avatar", formData, {
      isFormData: true,
    }),
  info: (path: string) =>
    request<ApiResponse<FileInfo>>("/files/info", { params: { path } }),
  config: () => request<ApiResponse<UploadConfig>>("/files/config"),
  delete: (payload: DeleteFilePayload) =>
    del<ApiResponse<Record<string, unknown>>>("/files", payload),
};

export const activityApi = {
  list: (params?: ListActivitiesParams) =>
    request<ApiResponse<PaginatedResource<ActivityEntry>>>("/activities", {
      params,
    }),
  myActivities: (params?: ListActivitiesParams) =>
    request<ApiResponse<PaginatedResource<ActivityEntry>>>("/activities/my", {
      params,
    }),
  userActivities: (userId: string | number, params?: ListActivitiesParams) =>
    request<ApiResponse<PaginatedResource<ActivityEntry>>>(
      `/activities/user/${userId}`,
      { params }
    ),
  statistics: () =>
    request<ApiResponse<ActivityStatistics>>(`/activities/statistics`),
  cleanup: (payload: CleanupActivitiesPayload) =>
    del<ApiResponse<Record<string, unknown>>>("/activities/cleanup", payload),
};

export const courseApi = moduleApi;

export const pointsApi = {
  summary: () =>
    request<ApiResponse<Record<string, unknown>>>("/points/summary"),
};

export const achievementsApi = {
  list: (params?: RequestParams) =>
    request<ApiResponse<PaginatedResource<Record<string, unknown>>>>(
      "/achievements",
      { params }
    ),
  unlocked: (params?: RequestParams) =>
    request<ApiResponse<Record<string, unknown>>>("/achievements/unlocked", {
      params,
    }),
};

export const progressApi = {
  module: (slug: string) =>
    request<ApiResponse<ModuleProgress>>(`/modules/${slug}/progress`),
  stats: () => request<ApiResponse<Record<string, unknown>>>("/progress/stats"),
  leaderboard: (params?: { limit?: number; period?: string }) =>
    request<ApiResponse<Record<string, unknown>>>("/progress/leaderboard", {
      params,
    }),
};

export const learningPathApi = {
  list: () =>
    withNotFoundFallback(
      request<ApiResponse<Module[]>>("/learning-path"),
      createEmptyResponse<Module[]>([])
    ),
  accessible: (params?: RequestParams) =>
    withNotFoundFallback(
      request<ApiResponse<PaginatedResource<Module>>>("/modules/accessible", {
        params,
      }),
      createEmptyResponse<PaginatedResource<Module>>(
        createEmptyPaginatedResource<Module>()
      )
    ),
  locked: (params?: RequestParams) =>
    withNotFoundFallback(
      request<ApiResponse<PaginatedResource<Module>>>("/modules/locked", {
        params,
      }),
      createEmptyResponse<PaginatedResource<Module>>(
        createEmptyPaginatedResource<Module>()
      )
    ),
};
