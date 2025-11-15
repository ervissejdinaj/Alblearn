export type UserRole = "admin" | "instructor" | "student";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  role: UserRole;
  totalPoints: number;
  createdAt: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  modulePoints: number;
  prerequisiteModuleId?: string;
  isPublished: boolean;
  createdAt: string;
  publishedAt?: string;
  instructorId?: string;
  sections?: Section[];
  quiz?: Quiz;
}

export interface Section {
  id: string;
  moduleId: string;
  contentHtml: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  moduleId: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: "open" | "closed";
  question: string;
  options?: string[];
  correctAnswer: string;
}

export type LessonStepType = "instruction" | "practice" | "media";

export interface LessonStep {
  id: string;
  title: string;
  content: string;
  type: LessonStepType;
  mediaUrl?: string;
}

export interface Progress {
  id: string;
  userId: string;
  moduleId: string;
  sectionNumberCompleted: number;
  completed: boolean;
  moduleScore: number;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ModuleStats {
  totalModules: number;
  publishedModules: number;
  completionRate: number;
  averageScore: number;
}

export interface UserStats {
  totalStudents: number;
  activeStudents: number;
  newStudentsThisMonth: number;
  topLearners: User[];
}
