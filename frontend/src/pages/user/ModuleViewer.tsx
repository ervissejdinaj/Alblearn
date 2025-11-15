import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { moduleApi, sectionApi, progressApi } from "../../services/alblearnApi";
import {
  Module,
  ModuleSection,
  PaginatedResource,
  ModuleProgress,
} from "../../types/api";
import { ApiError } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";

type ModuleWithEnrollmentMetadata = Module & {
  is_enrolled?: boolean;
  enrollment_status?: string | null;
  enrollment?: unknown;
  user_enrollment?: unknown;
  enrolled_at?: string | null;
};

const isModuleEnrolled = (moduleData: Module | null): boolean => {
  if (!moduleData) return false;
  const enriched = moduleData as ModuleWithEnrollmentMetadata;

  if (typeof enriched.is_enrolled === "boolean") {
    return enriched.is_enrolled;
  }

  if (typeof enriched.enrollment_status === "string") {
    return enriched.enrollment_status.toLowerCase() === "enrolled";
  }

  if (enriched.enrollment || enriched.user_enrollment) {
    return true;
  }

  if (enriched.enrolled_at) {
    return true;
  }

  return false;
};

const ModuleViewer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { state: auth } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [sections, setSections] = useState<ModuleSection[]>([]);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [isLoadingModule, setIsLoadingModule] = useState<boolean>(true);
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(true);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress | null>(
    null
  );

  const loadModule = React.useCallback(async () => {
    if (!slug) {
      setModuleError("Module identifier is missing.");
      setIsLoadingModule(false);
      return;
    }

    setIsLoadingModule(true);
    setModuleError(null);
    try {
      const response = await moduleApi.getBySlug(slug);
      setModule(response.data);
      setIsEnrolled(isModuleEnrolled(response.data));
    } catch (err) {
      if (err instanceof ApiError) {
        setModuleError(err.message);
      } else {
        setModuleError("Unable to load module details.");
      }
    } finally {
      setIsLoadingModule(false);
    }
  }, [slug]);

  const loadSections = React.useCallback(async () => {
    if (!slug) {
      setSectionsError("Module identifier is missing.");
      setIsLoadingSections(false);
      setIsEnrolled(false);
      return;
    }

    setIsLoadingSections(true);
    setSectionsError(null);
    try {
      const response = await sectionApi.list(slug, {
        published_only: true,
        per_page: 100,
      });
      const sectionData = response.data as
        | ModuleSection[]
        | PaginatedResource<ModuleSection>
        | undefined;

      if (Array.isArray(sectionData)) {
        setSections(sectionData);
      } else if (sectionData && !Array.isArray(sectionData)) {
        const collection = (sectionData as PaginatedResource<ModuleSection>)
          .data;
        setSections(Array.isArray(collection) ? collection : []);
      } else {
        setSections([]);
      }
      // Mos supozo enrollment vetëm sepse seksionet u kthyen
    } catch (err) {
      // Mos blloko aksesin për 403 - backend-i nuk duhet të bllokojë
      // Thjesht mos shfaq error, lejo që seksionet të ngarkohen nëse janë të disponueshme
      if (err instanceof ApiError) {
        if (err.status !== 403) {
          // Vetëm për gabime të tjera, jo për 403
          setSectionsError(err.message);
        }
        // Për 403, mos vendos error dhe mos blloko aksesin
      } else {
        setSectionsError("Unable to load sections.");
      }
      // Mos vendos sections në [] për 403 - lejo që seksionet e ngarkuar më parë të mbeten
      if (!(err instanceof ApiError && err.status === 403)) {
        setSections([]);
      }
    } finally {
      setIsLoadingSections(false);
    }
  }, [slug]);

  useEffect(() => {
    loadModule();
  }, [loadModule]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const loadModuleProgress = React.useCallback(async () => {
    if (!slug) {
      setModuleProgress(null);
      setIsEnrolled(false);
      return;
    }

    try {
      const response = await progressApi.module(slug);
      setModuleProgress(response.data);
      const enrolledFlag =
        (response.data as any)?.enrolled ?? (response.data as any)?.is_enrolled;
      if (typeof enrolledFlag === "boolean") {
        setIsEnrolled(enrolledFlag);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Not enrolled - mos blloko funksionalitetin
        setIsEnrolled(false);
        setModuleProgress(null);
      } else if (err instanceof ApiError && err.status === 404) {
        // Endpoint-i mund të mos ekzistojë në backend - mos blloko funksionalitetin
        // Thjesht mos vendos progress, por lejo që moduli të funksionojë normalisht
        setModuleProgress(null);
        // Mos ndrysho isEnrolled - lejo që përdoruesi të aksesojë modulin
      } else {
        // Për gabime të tjera, mos blloko funksionalitetin
        console.error("Unable to load module progress", err);
        setModuleProgress(null);
      }
    }
  }, [slug]);

  useEffect(() => {
    loadModuleProgress();
  }, [loadModuleProgress]);

  const formatPrice = useMemo(() => {
    return (mod: Module | null) => {
      if (!mod) return "";
      const raw = mod.effective_price ?? mod.price;
      const numeric =
        typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;

      if (Number.isFinite(numeric) && numeric > 0) {
        return `$${numeric.toFixed(2)}`;
      }
      return "Free";
    };
  }, []);

  const handleEnroll = async () => {
    if (auth.user?.role === "instructor") return; // instruktorët s'kanë nevojë
    if (!module || isEnrolled) return;

    try {
      await moduleApi.enroll(module.slug);
      setEnrollMessage("You are enrolled in this module. Keep learning!");
      setIsEnrolled(true);
      await loadSections();
      await loadModuleProgress();
    } catch (err) {
      if (err instanceof ApiError) {
        setEnrollMessage(err.message);
      } else {
        setEnrollMessage("Unable to enroll at this time.");
      }
    }
  };

  const handleOpenSection = (section: ModuleSection, index: number) => {
    if (!module) return;

    navigate(`/modules/${module.slug}/sections/${section.id}`, {
      state: {
        section,
        sections,
        currentIndex: index,
      },
    });
  };

  if (isLoadingModule) {
    return <LoadingSpinner />;
  }

  if (moduleError) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Module unavailable
          </h2>
          <p className="text-gray-600 mt-2">{moduleError}</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Module not found</h2>
          <p className="text-gray-600 mt-2">
            The module you are looking for has been removed or is not yet
            available.
          </p>
        </div>
      </div>
    );
  }

  const moduleTags = Array.isArray(module.tags) ? module.tags : [];
  const moduleOutcomes = Array.isArray(module.learning_outcomes)
    ? module.learning_outcomes
    : [];
  const moduleRequirements = Array.isArray(module.requirements)
    ? module.requirements
    : [];

  // Të gjitha seksionet janë gjithmonë të aksesueshme
  // Enroll-i përdoret vetëm për statistika, jo për kontrollin e aksesit
  // (isSectionAccessible u hoq sepse nuk përdoret më - të gjitha seksionet janë të aksesueshme)

  // Helper to get section completion status
  const getSectionCompletion = (
    section: ModuleSection
  ): { completed: boolean; completedAt: string | null } => {
    if (!moduleProgress || !Array.isArray(moduleProgress.sections))
      return { completed: false, completedAt: null };

    const sectionProgress = moduleProgress.sections.find(
      (sp) => sp.section_id === section.id
    );

    return {
      completed: sectionProgress?.is_completed ?? false,
      completedAt: sectionProgress?.completed_at ?? null,
    };
  };

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
            <p className="text-gray-600">
              {module.short_description ||
                module.description ||
                "No description available yet."}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>
                <span className="font-semibold text-gray-900">Status:</span>{" "}
                {module.status}
              </span>
              <span>
                <span className="font-semibold text-gray-900">Level:</span>{" "}
                {module.level || "All"}
              </span>
              <span>
                <span className="font-semibold text-gray-900">Duration:</span>{" "}
                {module.duration_hours ?? "—"} hours
              </span>
              <span>
                <span className="font-semibold text-gray-900">Lessons:</span>{" "}
                {module.lessons_count ?? 0}
              </span>
              <span>
                <span className="font-semibold text-gray-900">Investment:</span>{" "}
                {formatPrice(module)}
              </span>
            </div>

            {moduleTags.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-primary-700">
                {moduleTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-primary-100 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-[220px] space-y-3">
            {auth.user?.role === "instructor" ? (
              <button className="btn-primary w-full" disabled>
                Instructor access enabled
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                className="btn-primary w-full"
                disabled={isEnrolled}
              >
                {isEnrolled ? "Enrolled" : "Enroll in this module"}
              </button>
            )}
            {enrollMessage && (
              <p className="text-sm text-primary-700 text-center">
                {enrollMessage}
              </p>
            )}
            {moduleOutcomes.length > 0 && (
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm text-primary-800">
                <h3 className="font-semibold text-primary-900 mb-2">
                  You will learn to:
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {moduleOutcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Module sections</h2>
          <span className="text-sm text-gray-500">
            {sections.length} {sections.length === 1 ? "section" : "sections"}
          </span>
        </div>

        {sectionsError && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded">
            {sectionsError}
          </div>
        )}

        {isLoadingSections ? (
          <div className="py-10 text-center text-secondary-500">
            Loading sections...
          </div>
        ) : sections.length === 0 ? (
          <p className="text-sm text-gray-500">
            Sections for this module are coming soon.
          </p>
        ) : (
          <div className="space-y-4">
            {[...sections]
              .sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0))
              .map((section, index) => {
                // Të gjitha seksionet janë gjithmonë të aksesueshme
                const { completed, completedAt } =
                  getSectionCompletion(section);

                return (
                  <div
                    key={section.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenSection(section, index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenSection(section, index);
                      }
                    }}
                    className={`border rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-all ${
                      completed
                        ? "border-success-300 bg-success-50/30 hover:border-success-400 cursor-pointer"
                        : "border-gray-200 hover:border-primary-200 cursor-pointer"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {completed ? (
                            <svg
                              className="w-5 h-5 text-success-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-gray-400"
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
                          )}
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-semibold ${
                              completed
                                ? "text-success-900"
                                : "text-gray-900"
                            }`}
                          >
                            {section.order_number
                              ? `Section ${section.order_number}: `
                              : ""}
                            {section.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {section.description ||
                              "Start exploring this section to unlock more content."}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {section.points ? (
                              <p className="text-xs text-primary-600">
                                {section.points} learning points ·{" "}
                                {section.total_quiz_points ?? 0} quiz points
                              </p>
                            ) : null}
                            {completed && completedAt && (
                              <p className="text-xs text-success-600">
                                ✓ Completed{" "}
                                {new Date(completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/modules/${module.slug}/sections/${section.id}`}
                        state={{
                          section,
                          sections,
                          currentIndex: index,
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="btn-secondary"
                      >
                        {completed ? "Review" : "View section"}
                      </Link>
                      {section.has_quizzes ? (
                        <Link
                          to={`/modules/${module.slug}/sections/${section.id}/quiz`}
                          onClick={(event) => event.stopPropagation()}
                          className="btn-primary"
                        >
                          Take quiz
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {moduleRequirements.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Before you start
          </h2>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {moduleRequirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ModuleViewer;
