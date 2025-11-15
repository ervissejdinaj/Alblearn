import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StatusBadge from "../../components/StatusBadge";
import { moduleApi, achievementsApi } from "../../services/alblearnApi";
import { Module, ModuleEnrollment, ModuleStatistics } from "../../types/api";
import { ApiError } from "../../services/apiClient";

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const InstructorDashboard: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleStats, setModuleStats] = useState<Record<string, ModuleStatistics>>({});
  const [moduleEnrollments, setModuleEnrollments] = useState<Record<string, ModuleEnrollment[]>>({});
  const [achievements, setAchievements] = useState<Record<string, unknown>[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);

  const loadModules = useCallback(async () => {
    if (!state.user) {
      setModules([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const instructorId = normalizeId(state.user.id);

    try {
      // Provo të kërkosh modulet me instructor_id si parameter
      const paramsWithInstructor: Parameters<typeof moduleApi.list>[0] = {
        per_page: 100,
        ...(instructorId && { instructor_id: instructorId }),
      };

      console.log(
        "Loading instructor modules with params:",
        paramsWithInstructor
      );

      let response = await moduleApi.list(paramsWithInstructor);
      let fetched = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      console.log("Modules fetched from API (with instructor_id):", {
        total: fetched.length,
        instructorId,
      });

      // Nëse nuk kemi rezultate me instructor_id parameter, provo pa parameter dhe filtro më inteligjentisht
      if (fetched.length === 0 && instructorId) {
        console.log(
          "No modules found with instructor_id parameter, trying without filter..."
        );

        const responseUnfiltered = await moduleApi.list({ per_page: 100 });
        const fetchedUnfiltered = Array.isArray(responseUnfiltered.data)
          ? responseUnfiltered.data
          : responseUnfiltered.data?.data || [];

        console.log("All modules available:", {
          total: fetchedUnfiltered.length,
          samples: fetchedUnfiltered.slice(0, 3).map((m) => ({
            title: m.title,
            instructor_id: m.instructor_id,
            instructor: m.instructor,
          })),
        });

        fetched = fetchedUnfiltered;
      }

      // Filtro modulet - kontrollojë nëse janë të lidhur me këtë instruktor
      const filtered = fetched.filter((module) => {
        if (!state.user) return false;

        const moduleInstructorId =
          normalizeId(module.instructor_id) ??
          normalizeId(module.instructor?.id) ??
          null;

        const emailMatch =
          module.instructor?.email &&
          module.instructor.email.toLowerCase() ===
            state.user.email.toLowerCase();

        const nameMatch =
          module.instructor?.name &&
          (module.instructor.name ===
            `${state.user.firstName} ${state.user.lastName}` ||
            module.instructor.name.toLowerCase() ===
              `${state.user.firstName} ${state.user.lastName}`.toLowerCase());

        const idMatch =
          moduleInstructorId === instructorId ||
          (instructorId && moduleInstructorId === instructorId);

        const isMatched = idMatch || emailMatch || nameMatch;

        if (!isMatched && module.instructor) {
          console.debug(`Module "${module.title}" not matched to instructor:`, {
            moduleInstructorId,
            userInstructorId: instructorId,
            emailMatch,
            nameMatch,
            idMatch,
            instructor: {
              id: module.instructor.id,
              email: module.instructor.email,
              name: module.instructor.name,
            },
          });
        }

        return isMatched;
      });

      console.log("Filtered modules count:", filtered.length);
      setModules(filtered);
    } catch (err) {
      console.error("Error loading modules:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load modules. Please try again later.");
      }
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, [state.user]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Load statistics and enrollments for each module
  const loadModuleDetails = useCallback(async () => {
    if (modules.length === 0) return;

    setIsLoadingStats(true);
    const statsMap: Record<string, ModuleStatistics> = {};
    const enrollmentsMap: Record<string, ModuleEnrollment[]> = {};

    try {
      await Promise.all(
        modules.map(async (module) => {
          try {
            // Load statistics
            const statsResponse = await moduleApi.statistics(module.slug);
            statsMap[module.slug] = statsResponse.data;

            // Load enrollments
            const enrollmentsResponse = await moduleApi.enrollments(module.slug, {
              per_page: 100,
            });
            enrollmentsMap[module.slug] = enrollmentsResponse.data.data || [];
          } catch (err) {
            console.error(`Error loading details for module ${module.slug}:`, err);
            // Set defaults if API fails
            statsMap[module.slug] = {
              total_enrollments: 0,
              active_learners: 0,
              completion_rate: 0,
              average_progress: 0,
            };
            enrollmentsMap[module.slug] = [];
          }
        })
      );

      setModuleStats(statsMap);
      setModuleEnrollments(enrollmentsMap);
    } catch (err) {
      console.error("Error loading module details:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [modules]);

  // Load achievements
  const loadAchievements = useCallback(async () => {
    try {
      const response = await achievementsApi.list({ per_page: 50 });
      // Handle both PaginatedResource and direct array responses
      const achievementsData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      setAchievements(achievementsData);
    } catch (err) {
      console.error("Error loading achievements:", err);
      setAchievements([]);
    }
  }, []);

  useEffect(() => {
    if (modules.length > 0) {
      loadModuleDetails();
      loadAchievements();
    }
  }, [modules, loadModuleDetails, loadAchievements]);

  const stats = useMemo(() => {
    const total = modules.length;
    const published = modules.filter(
      (module) => module.status === "published"
    ).length;
    const draft = modules.filter((module) => module.status === "draft").length;
    
    // Calculate total students across all modules
    const totalStudents = Object.values(moduleEnrollments).reduce(
      (sum, enrollments) => sum + enrollments.length,
      0
    );

    return { total, published, draft, totalStudents };
  }, [modules, moduleEnrollments]);

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Instructor Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {state.user?.firstName}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Modules</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : stats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : stats.published}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingStats ? "–" : stats.totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : stats.draft}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Modules</h2>
          <button
            onClick={loadModules}
            className="btn-secondary w-full md:w-auto"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh modules"}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            Loading your modules...
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No modules available
            </h3>
            <p className="text-gray-500">
              Ask an administrator to publish modules, then they’ll appear here
              for you to build out.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/instructor/modules/${module.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/instructor/modules/${module.slug}`);
                  }
                }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {module.title}
                  </h3>
                  <StatusBadge
                    label={
                      module.status === "published"
                        ? "Published"
                        : module.status || "Draft"
                    }
                    variant={
                      module.status === "published" ? "success" : "warning"
                    }
                  />
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {module.short_description ||
                    module.description ||
                    "No description provided yet."}
                </p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Level:</span>
                    <span className="font-medium">{module.level || "All"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lessons:</span>
                    <span className="font-medium">
                      {module.lessons_count ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">
                      {new Date(module.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Statistics */}
                {moduleStats[module.slug] && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Enrollments:</span>
                        <span className="font-medium ml-1">{moduleStats[module.slug].total_enrollments}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Active:</span>
                        <span className="font-medium ml-1">{moduleStats[module.slug].active_learners}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Completion:</span>
                        <span className="font-medium ml-1">
                          {typeof moduleStats[module.slug].completion_rate === 'number' 
                            ? moduleStats[module.slug].completion_rate.toFixed(1) 
                            : Number(moduleStats[module.slug].completion_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Progress:</span>
                        <span className="font-medium ml-1">
                          {typeof moduleStats[module.slug].average_progress === 'number' 
                            ? moduleStats[module.slug].average_progress.toFixed(1) 
                            : Number(moduleStats[module.slug].average_progress || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Students enrolled */}
                {moduleEnrollments[module.slug] && moduleEnrollments[module.slug].length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Students ({moduleEnrollments[module.slug].length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {moduleEnrollments[module.slug].slice(0, 5).map((enrollment) => (
                        <div key={enrollment.id} className="text-xs text-gray-600">
                          <span className="font-medium">{enrollment.user?.name || enrollment.user_id}</span>
                          <span className="ml-2">
                            ({typeof enrollment.progress === 'number' 
                              ? enrollment.progress.toFixed(0) 
                              : typeof enrollment.progress === 'string' 
                                ? Number(enrollment.progress || 0).toFixed(0) 
                                : 0}%)
                          </span>
                        </div>
                      ))}
                      {moduleEnrollments[module.slug].length > 5 && (
                        <div className="text-xs text-gray-500 italic">
                          +{moduleEnrollments[module.slug].length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-2">
                  <Link
                    to={`/instructor/modules/${module.slug}?view=sections`}
                    onClick={(event) => event.stopPropagation()}
                    className="btn-primary w-full text-center"
                  >
                    Build sections
                  </Link>
                  <Link
                    to={`/instructor/modules/${module.slug}?view=quizzes`}
                    onClick={(event) => event.stopPropagation()}
                    className="btn-secondary w-full text-center"
                  >
                    Build quizzes
                  </Link>
                  <Link
                    to={`/modules/${module.slug}`}
                    onClick={(event) => event.stopPropagation()}
                    className="btn-secondary w-full text-center"
                  >
                    Preview as student
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements Section */}
      {achievements.length > 0 && (
        <div className="card mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Available Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.slice(0, 9).map((achievement: any, index) => (
              <div
                key={achievement.id || index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-yellow-100 mr-3">
                    <svg
                      className="w-6 h-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {achievement.name || achievement.title || `Achievement ${index + 1}`}
                    </h3>
                    {achievement.description && (
                      <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                    )}
                    {achievement.points && (
                      <p className="text-xs text-primary-600 font-medium mt-1">
                        {achievement.points} points
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {achievements.length > 9 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing 9 of {achievements.length} achievements
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
