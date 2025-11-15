import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { moduleApi, sectionApi } from "../../services/alblearnApi";
import {
  Module,
  ModuleSection,
  PaginatedResource,
} from "../../types/api";
import { ApiError } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import { LessonStep } from "../../types";
import { resolveLessonSteps } from "../../utils/lesson";

interface LocationState {
  section?: ModuleSection;
  sections?: ModuleSection[];
  currentIndex?: number;
}

const SectionViewer: React.FC = () => {
  const { slug, sectionId } = useParams<{ slug: string; sectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | undefined;

  const [module, setModule] = useState<Module | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [isLoadingModule, setIsLoadingModule] = useState<boolean>(true);

  const [sections, setSections] = useState<ModuleSection[]>(
    Array.isArray(locationState?.sections) ? locationState?.sections ?? [] : []
  );
  const [section, setSection] = useState<ModuleSection | null>(
    locationState?.section ?? null
  );
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const loadModule = useCallback(async () => {
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

  const loadSections = useCallback(async () => {
    if (!slug) {
      setSectionsError("Module identifier is missing.");
      return;
    }

    setSectionsError(null);
    try {
      const response = await sectionApi.list(slug, {
        per_page: 100,
      });
      const data = response.data as
        | ModuleSection[]
        | PaginatedResource<ModuleSection>
        | undefined;

      if (Array.isArray(data)) {
        setSections(data);
      } else if (data && !Array.isArray(data)) {
        const collection = (data as PaginatedResource<ModuleSection>).data;
        setSections(Array.isArray(collection) ? collection : []);
      } else {
        setSections([]);
      }
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
      // no-op
    }
  }, [slug]);

  const loadSectionDetail = useCallback(async () => {
    if (!slug || !sectionId) {
      setSectionError("Section identifier is missing.");
      return;
    }

    setSectionError(null);
    try {
      const response = await sectionApi.get(slug, sectionId);
      setSection(response.data);
    } catch (err) {
      // Mos blloko aksesin për 403 - backend-i nuk duhet të bllokojë
      // Thjesht mos shfaq error, lejo që seksioni të ngarkohet nëse është i disponueshëm
      if (err instanceof ApiError) {
        if (err.status !== 403) {
          // Vetëm për gabime të tjera, jo për 403
          setSectionError(err.message);
        }
        // Për 403, mos vendos error dhe mos blloko aksesin
      } else {
        setSectionError("Unable to load this section.");
      }
    }
  }, [slug, sectionId]);

  useEffect(() => {
    loadModule();
  }, [loadModule]);

  useEffect(() => {
    if (!locationState?.sections) {
      loadSections();
    }
  }, [loadSections, locationState?.sections]);

  useEffect(() => {
    if (!locationState?.section) {
      loadSectionDetail();
    }
  }, [loadSectionDetail, locationState?.section]);

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [section?.id]);

  const orderedSections = useMemo(
    () =>
      [...sections].sort(
        (a, b) => (a.order_number ?? 0) - (b.order_number ?? 0)
      ),
    [sections]
  );

  const currentIndex = useMemo(() => {
    if (locationState?.currentIndex !== undefined) {
      return locationState.currentIndex;
    }
    if (!sectionId) {
      return -1;
    }
    return orderedSections.findIndex(
      (item) => String(item.id) === String(sectionId)
    );
  }, [orderedSections, sectionId, locationState?.currentIndex]);

  const previousSection =
    currentIndex > 0 ? orderedSections[currentIndex - 1] : null;
  const nextSection =
    currentIndex >= 0 ? orderedSections[currentIndex + 1] : null;

  const handleBackToModule = () => {
    navigate(module ? `/modules/${module.slug}` : "/dashboard");
  };

  const goToSection = (target: ModuleSection, index: number) => {
    if (!module) return;
    navigate(`/modules/${module.slug}/sections/${target.id}`, {
      state: {
        section: target,
        sections,
        currentIndex: index,
      },
    });
  };

  const continueToNextSection = async () => {
    if (!module || !section) {
      handleBackToModule();
      return;
    }

    // Mark section as complete when user finishes all lesson steps
    // Por mos blloko funksionalitetin nëse backend-i refuzon
    try {
      await sectionApi.markComplete(section.id);
      // Section completion is tracked by backend
    } catch (err) {
      // Mos blloko funksionalitetin - backend-i mund të refuzojë për arsye të ndryshme
      // Por kjo nuk duhet të pengojë përdoruesin të vazhdojë
      if (err instanceof ApiError) {
        // Për 400/403, mos shfaq error që bllokon - thjesht loggo
        if (err.status === 400 || err.status === 403) {
          // Backend po bllokon, por mos blloko funksionalitetin në frontend
          console.warn("Backend refused to mark section as complete:", err.message);
        } else {
          console.error("Unable to mark section as complete", err);
        }
      } else {
        console.error("Unable to mark section as complete", err);
      }
    }

    if (section.has_quizzes) {
      navigate(`/modules/${module.slug}/sections/${section.id}/quiz`, {
        state: { section, sections },
      });
    } else if (nextSection) {
      goToSection(nextSection, currentIndex + 1);
    } else {
      handleBackToModule();
    }
  };
  const lessonSteps: LessonStep[] = useMemo(
    () => resolveLessonSteps(section?.lesson_steps, section?.content ?? null),
    [section?.lesson_steps, section?.content]
  );
  const hasLessonSteps = lessonSteps.length > 0;
  const currentLessonStep = hasLessonSteps
    ? lessonSteps[Math.min(currentStepIndex, lessonSteps.length - 1)]
    : null;
  const handleNextStep = () => {
    if (!hasLessonSteps) {
      continueToNextSection();
      return;
    }
    if (currentStepIndex < lessonSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // On last step: directly continue (backend will handle viewed state)
      continueToNextSection();
    }
  };
  const handlePreviousStep = () => {
    if (!hasLessonSteps || currentStepIndex === 0) {
      if (previousSection) {
        goToSection(previousSection, Math.max(currentIndex - 1, 0));
      } else {
        handleBackToModule();
      }
      return;
    }
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  // Të gjitha seksionet janë gjithmonë të aksesueshme
  // Nuk ka kontroll të completimit të seksionit paraprak
  // (canAccessSection u hoq sepse nuk përdoret më - të gjitha seksionet janë të aksesueshme)

  if (isLoadingModule) {
    return <LoadingSpinner />;
  }

  if (moduleError) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Module unavailable
          </h1>
          <p className="text-gray-600 mb-6">{moduleError}</p>
          <button onClick={handleBackToModule} className="btn-primary">
            Back to module
          </button>
        </div>
      </div>
    );
  }

  if (!section || sectionError) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Section unavailable
          </h1>
          <p className="text-gray-600 mb-6">
            {sectionError || "We couldn't find this section."}
          </p>
          <button onClick={handleBackToModule} className="btn-primary">
            Back to module
          </button>
        </div>
      </div>
    );
  }

  // Të gjitha seksionet janë gjithmonë të aksesueshme - nuk ka ekran "Section Locked"

  const totalSteps = lessonSteps.length;
  const stepProgress = hasLessonSteps
    ? ((currentStepIndex + 1) / totalSteps) * 100
    : currentIndex >= 0 && orderedSections.length > 0
    ? ((currentIndex + 1) / orderedSections.length) * 100
    : 0;
  const isLastStep = hasLessonSteps && currentStepIndex === totalSteps - 1;
  const nextButtonLabel = hasLessonSteps
    ? isLastStep
      ? section.has_quizzes
        ? "Start quiz"
        : nextSection
        ? `Next: ${nextSection.title}`
        : "Complete module"
      : "Next step"
    : section.has_quizzes
    ? "Start quiz"
    : nextSection
    ? `Next: ${nextSection.title}`
    : "Complete module";
  const previousButtonLabel =
    hasLessonSteps && currentStepIndex > 0
      ? "Previous step"
      : previousSection
      ? `Previous: ${previousSection.title}`
      : "Back to module";

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {module?.title} • Section {section.order_number ?? ""}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{section.title}</h1>
        </div>
        <button onClick={handleBackToModule} className="btn-secondary">
          Back to module
        </button>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${stepProgress}%` }}
        ></div>
      </div>

      {hasLessonSteps ? (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="card space-y-3">
            <h2 className="text-sm font-semibold text-secondary-700">
              Lesson outline
            </h2>
            <ol className="space-y-2 text-sm text-secondary-600">
              {lessonSteps.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(index)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition ${
                      index === currentStepIndex
                        ? "bg-primary-50 text-primary-700 font-semibold"
                        : "hover:bg-secondary-50"
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-wide text-secondary-400">
                      Step {index + 1}
                    </span>
                    <span>{step.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <article className="card space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-400">
                  Step {currentStepIndex + 1} of {totalSteps}
                </p>
                <h2 className="text-2xl font-semibold text-secondary-900">
                  {currentLessonStep?.title}
                </h2>
              </div>
              <span className="text-xs font-semibold text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                {currentLessonStep?.type === "practice"
                  ? "Practice"
                  : currentLessonStep?.type === "media"
                  ? "Media"
                  : "Instruction"}
              </span>
            </div>

            <div className="prose prose-sm sm:prose lg:prose-lg max-w-none text-secondary-700">
              {currentLessonStep ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: currentLessonStep.content.replace(/\n/g, "<br />"),
                  }}
                />
              ) : (
                <p>Lesson content coming soon.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-gray-200">
              <button onClick={handlePreviousStep} className="btn-secondary">
                {previousButtonLabel}
              </button>
              <button onClick={handleNextStep} className="btn-primary">
                {nextButtonLabel}
              </button>
            </div>
          </article>
        </div>
      ) : (
        <div className="card space-y-6">
          <div className="prose prose-lg max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: section.content || "<p>Content coming soon.</p>",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={() =>
                previousSection
                  ? goToSection(previousSection, Math.max(currentIndex - 1, 0))
                  : handleBackToModule()
              }
              className="btn-secondary"
            >
              {previousSection
                ? `Previous: ${previousSection.title}`
                : "Back to module"}
            </button>
            <button onClick={continueToNextSection} className="btn-primary">
              {section.has_quizzes
                ? "Start quiz"
                : nextSection
                ? `Next: ${nextSection.title}`
                : "Complete module"}
            </button>
          </div>
        </div>
      )}

      {section.quizzes && section.quizzes.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Quizzes in this section
          </h2>
          <ul className="space-y-3">
            {section.quizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="p-3 border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <div className="font-semibold text-gray-900">
                  {quiz.question}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {quiz.points ?? 0} points · {quiz.type}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sectionsError && (
        <div className="card bg-yellow-50 border border-yellow-200 text-yellow-700">
          {sectionsError}
        </div>
      )}
    </div>
  );
};

export default SectionViewer;
