import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizApi, sectionApi, moduleApi } from "../../services/alblearnApi";
import { Module, ModuleSection, ModuleQuiz } from "../../types/api";
import { ApiError } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";

interface QuizStatus {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
}

const getNumberFromRecord = (
  source: Record<string, unknown> | null,
  key: string
): number | null => {
  if (!source) return null;
  const value = source[key];
  return typeof value === "number" ? value : null;
};

const getStringFromRecord = (
  source: Record<string, unknown> | null,
  key: string
): string | null => {
  if (!source) return null;
  const value = source[key];
  return typeof value === "string" ? value : null;
};

const getRecordsFromRecord = (
  source: Record<string, unknown> | null,
  key: string
): Record<string, unknown>[] => {
  if (!source) return [];
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
  );
};

const QuizPage: React.FC = () => {
  const { slug, sectionId } = useParams<{ slug: string; sectionId: string }>();
  const navigate = useNavigate();

  const [module, setModule] = useState<Module | null>(null);
  const [section, setSection] = useState<ModuleSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [quizStatus, setQuizStatus] = useState<Record<string, QuizStatus>>({});
  const [rawQuizzes, setRawQuizzes] = useState<ModuleQuiz[]>([]);
  const [isQuizzesLoading, setIsQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);
  const [sectionProgress, setSectionProgress] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submittedMap, setSubmittedMap] = useState<Record<string, boolean>>({});

  const autoAdvanceTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!slug || !sectionId) {
      setError("Quiz information is missing.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Ngarko modulin fillimisht
        const moduleResponse = await moduleApi.getBySlug(slug);
        setModule(moduleResponse.data);

        // Provo të ngarkosh seksionin, por mos blloko nëse kthen 403
        // Quiz-et duhet të jenë të aksesueshme edhe pa seksion
        try {
          const sectionResponse = await sectionApi.get(slug, sectionId);
          setSection(sectionResponse.data);
        } catch (sectionErr) {
          // Nëse seksioni kthen 403, mos blloko - quiz-et mund të ngarkohen direkt
          if (sectionErr instanceof ApiError && sectionErr.status === 403) {
            console.warn("Section access blocked by backend, but quizzes may still be accessible");
            // Vendos section null, por lejo ngarkimin e quiz-eve
            setSection(null);
          } else {
            // Për gabime të tjera, vendos error
            setSection(null);
            if (sectionErr instanceof ApiError) {
              setError(sectionErr.message);
            } else {
              setError("Unable to load section details.");
            }
          }
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Unable to load module information.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [slug, sectionId]);

  const quizzes = useMemo(() => rawQuizzes, [rawQuizzes]);

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setQuizStatus({});
    setSubmittedMap({});
  }, [section?.id]);

  useEffect(() => {
    // Quiz-et mund të ngarkohen edhe nëse seksioni nuk është i aksesueshëm
    // Përdor sectionId nga URL params nëse section object nuk është i disponueshëm
    const targetSectionId = section?.id || sectionId;
    
    if (!targetSectionId) {
      setRawQuizzes([]);
      setQuizzesError(null);
      setIsQuizzesLoading(false);
      return;
    }

    const sortQuizzes = (items: ModuleQuiz[]) =>
      [...items].sort((a, b) => {
        const orderA = a.order_number ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order_number ?? Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        return orderA - orderB;
      });

    const embedded =
      section && Array.isArray(section.quizzes) && section.quizzes.length > 0
        ? section.quizzes
        : null;

    if (embedded) {
      setRawQuizzes(sortQuizzes(embedded));
      setQuizzesError(null);
      setIsQuizzesLoading(false);
      return;
    }

    const fetchQuizzes = async () => {
      setIsQuizzesLoading(true);
      setQuizzesError(null);
      try {
        // Përdor sectionId nga URL nëse section object nuk është i disponueshëm
        const targetSectionId = section?.id || sectionId;
        if (!targetSectionId) {
          setRawQuizzes([]);
          setIsQuizzesLoading(false);
          return;
        }

        const response = await quizApi.listForSection(targetSectionId, {
          published_only: true,
        });
        setRawQuizzes(sortQuizzes(response.data));
      } catch (err) {
        // Mos blloko aksesin për 403 - backend-i nuk duhet të bllokojë
        // Thjesht mos shfaq error, lejo që quiz-et të ngarkohen nëse janë të disponueshme
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setQuizzesError("Quizzes are not available for this section yet.");
          } else if (err.status !== 403) {
            // Vetëm për gabime të tjera, jo për 403
            setQuizzesError(err.message);
          }
          // Për 403, mos vendos error - lejo që quiz-et të ngarkohen nëse janë të disponueshme
        } else {
          setQuizzesError("Unable to load quizzes for this section.");
        }
        // Mos vendos rawQuizzes në [] për 403 - lejo që quiz-et e ngarkuar më parë të mbeten
        if (!(err instanceof ApiError && err.status === 403)) {
          setRawQuizzes([]);
        }
      } finally {
        setIsQuizzesLoading(false);
      }
    };

    fetchQuizzes();
  }, [section, sectionId]);

  useEffect(() => {
    if (currentIndex >= quizzes.length && quizzes.length > 0) {
      setCurrentIndex(quizzes.length - 1);
    }
  }, [currentIndex, quizzes.length]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeout.current) {
        window.clearTimeout(autoAdvanceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    // Përdor sectionId nga URL nëse section object nuk është i disponueshëm
    const targetSectionId = section?.id || sectionId;
    
    if (!targetSectionId) {
      setSectionProgress(null);
      setQuizAttempts({});
      return;
    }

    const loadSectionProgress = async () => {
      try {
        const response = await quizApi.sectionProgress(targetSectionId);
        setSectionProgress(response.data);
        setProgressError(null);
      } catch (err) {
        // Non-fatal error - progress nuk është kritik për aksesin në quiz-et
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to load quiz progress.";
        setProgressError(message);
      }
    };

    const loadAttempts = async () => {
      if (!quizzes.length) {
        setQuizAttempts({});
        return;
      }

      const attemptsEntries = await Promise.all(
        quizzes.map(async (quiz) => {
          try {
            const attemptsResponse = await quizApi.attempts(quiz.id, {
              per_page: 5,
            });
            // Kontrollo nëse përgjigjja dhe data ekzistojnë
            if (attemptsResponse?.data?.data) {
              return [quiz.id, attemptsResponse.data.data] as const;
            }
            return [quiz.id, []] as const;
          } catch (err) {
            console.error("Unable to load attempts for quiz", quiz.id, err);
            return [quiz.id, []] as const;
          }
        })
      );

      setQuizAttempts(Object.fromEntries(attemptsEntries));
    };

    loadSectionProgress();
    loadAttempts();
  }, [section, sectionId, quizzes]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentIndex]);

  const completedCount = useMemo(() => {
    if (!quizzes.length) return 0;
    return quizzes.reduce((count, quiz) => {
      const hasAttempts =
        Array.isArray(quizAttempts[quiz.id]) &&
        quizAttempts[quiz.id].length > 0;
      return submittedMap[quiz.id] || hasAttempts ? count + 1 : count;
    }, 0);
  }, [quizzes, quizAttempts, submittedMap]);

  const totalQuizzes = quizzes.length;
  const currentQuiz = totalQuizzes ? quizzes[currentIndex] : null;
  const currentQuizId = currentQuiz?.id ?? "";
  const currentStatus = (currentQuiz && quizStatus[currentQuiz.id]) || {
    state: "idle",
  };
  const currentAnswer = (currentQuiz && selectedAnswers[currentQuiz.id]) ?? "";
  const progressBasis = currentQuiz ? currentIndex + 1 : 0;
  const progressPercentage = totalQuizzes
    ? Math.min(
        100,
        (Math.max(completedCount, progressBasis) / totalQuizzes) * 100
      )
    : 0;
  const isSubmitting = currentStatus.state === "loading";
  const isLastQuestion = totalQuizzes > 0 && currentIndex === totalQuizzes - 1;

  const progressCompletedQuizzes = getNumberFromRecord(
    sectionProgress,
    "completed_quizzes"
  );
  const progressTotalQuizzes = getNumberFromRecord(
    sectionProgress,
    "total_quizzes"
  );
  const progressScore = getNumberFromRecord(sectionProgress, "score");
  const progressPointsEarned = getNumberFromRecord(
    sectionProgress,
    "points_earned"
  );
  const progressTotalPoints = getNumberFromRecord(
    sectionProgress,
    "total_points_available"
  );
  const progressLastAttemptAt = getStringFromRecord(
    sectionProgress,
    "last_attempt_at"
  );
  const progressQuizDetails = useMemo(
    () => getRecordsFromRecord(sectionProgress, "quizzes"),
    [sectionProgress]
  );

  const handleAnswerChange = (quizId: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: value }));
    setQuizStatus((prev) => ({ ...prev, [quizId]: { state: "idle" } }));
    setSubmittedMap((prev) => {
      if (!prev[quizId]) return prev;
      const next = { ...prev };
      delete next[quizId];
      return next;
    });
  };

  const handleSubmit = async (quiz: ModuleQuiz) => {
    const answer = selectedAnswers[quiz.id];
    if (!answer || !answer.trim()) {
      setQuizStatus((prev) => ({
        ...prev,
        [quiz.id]: {
          state: "error",
          message: "Please provide an answer before submitting.",
        },
      }));
      return;
    }

    setQuizStatus((prev) => ({
      ...prev,
      [quiz.id]: { state: "loading" },
    }));

    try {
      await quizApi.submit(quiz.id, { user_answer: answer });

      const quizIndex = quizzes.findIndex((item) => item.id === quiz.id);
      const completedMessage =
        quizIndex === quizzes.length - 1
          ? "Answer submitted! Quiz complete."
          : "Answer submitted! Moving to the next question...";

      setQuizStatus((prev) => ({
        ...prev,
        [quiz.id]: { state: "success", message: completedMessage },
      }));
      setSubmittedMap((prev) => ({ ...prev, [quiz.id]: true }));

      if (section) {
        try {
          const [progressResponse, attemptsResponse] = await Promise.all([
            quizApi.sectionProgress(section.id),
            quizApi.attempts(quiz.id, { per_page: 5 }),
          ]);
          if (progressResponse?.data) {
            setSectionProgress(progressResponse.data);
          }
          if (attemptsResponse?.data?.data) {
            setQuizAttempts((prev) => ({
              ...prev,
              [quiz.id]: attemptsResponse.data.data,
            }));
          }
        } catch (refreshErr) {
          console.error("Unable to refresh quiz analytics", refreshErr);
        }
      }

      if (quizIndex !== -1 && quizIndex < quizzes.length - 1) {
        if (autoAdvanceTimeout.current) {
          window.clearTimeout(autoAdvanceTimeout.current);
        }
        autoAdvanceTimeout.current = window.setTimeout(() => {
          setCurrentIndex(quizIndex + 1);
        }, 900);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Submission failed. Please try again.";
      setQuizStatus((prev) => ({
        ...prev,
        [quiz.id]: { state: "error", message },
      }));
    }
  };

  const handleNavigateToSection = () => {
    if (module && section) {
      navigate(`/modules/${module.slug}/sections/${section.id}`);
    } else {
      navigate("/dashboard");
    }
  };

  // If all quizzes are complete, attempt to mark the section complete
  // Por vetëm nëse kemi section object - nëse nuk kemi, mos provo
  useEffect(() => {
    const tryCompleteSection = async () => {
      // Përdor sectionId nga URL nëse section object nuk është i disponueshëm
      const targetSectionId = section?.id || sectionId;
      if (!targetSectionId || !module) return;
      
      // When completed quizzes equals total quizzes, request completion
      const completed = completedCount;
      if (totalQuizzes > 0 && completed === totalQuizzes) {
        try {
          await sectionApi.markComplete(targetSectionId);
        } catch (err) {
          // ignore; backend may require viewed flag or may block access
          // Nuk duhet të bllokojë funksionalitetin e quiz-eve
          console.warn("Unable to mark section as complete:", err);
        }
      }
    };

    void tryCompleteSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount, totalQuizzes, section?.id, sectionId]);

  const handleNavigateToModule = () => {
    if (module) {
      navigate(`/modules/${module.slug}`);
    } else {
      navigate("/dashboard");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Nëse moduli nuk mund të ngarkohet, shfaq error
  // Por nëse vetëm seksioni nuk mund të ngarkohet, lejo aksesin në quiz-et
  if (error && !module) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Quizzes unavailable
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "We couldn't load quizzes for this section."}
          </p>
          <button onClick={handleNavigateToModule} className="btn-primary">
            Back to module
          </button>
        </div>
      </div>
    );
  }

  // Nëse nuk kemi sectionId, nuk mund të ngarkojmë quiz-et
  if (!sectionId) {
    return (
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Section information missing
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't identify which section's quizzes to load.
          </p>
          <button onClick={handleNavigateToModule} className="btn-primary">
            Back to module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {module?.title || "Module"} • Section {section?.order_number ?? sectionId}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Section quiz</h1>
          <p className="text-gray-600 mt-2">
            Work through each step to confirm what you've learned.
          </p>
          {!section && (
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ Section details unavailable, but quizzes are still accessible.
            </p>
          )}
        </div>
        {section ? (
          <button onClick={handleNavigateToSection} className="btn-secondary">
            Back to section
          </button>
        ) : (
          <button onClick={handleNavigateToModule} className="btn-secondary">
            Back to module
          </button>
        )}
      </div>

      {(sectionProgress || progressError) && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Your quiz progress
            </h2>
            <button
              className="text-sm text-secondary-600 hover:text-secondary-900"
              onClick={() => {
                if (section) {
                  quizApi
                    .sectionProgress(section.id)
                    .then((response) => {
                      setSectionProgress(response.data);
                      setProgressError(null);
                    })
                    .catch((err) => {
                      const message =
                        err instanceof ApiError
                          ? err.message
                          : "Unable to refresh progress.";
                      setProgressError(message);
                    });
                }
              }}
              disabled={!section}
            >
              Refresh
            </button>
          </div>

          {progressError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded text-sm mb-3">
              {progressError}
            </div>
          )}

          {sectionProgress ? (
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
              {progressCompletedQuizzes != null &&
                progressTotalQuizzes != null && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-1 font-semibold text-gray-900">
                      Quizzes completed
                    </p>
                    <p>
                      {progressCompletedQuizzes} of {progressTotalQuizzes}
                    </p>
                  </div>
                )}
              {progressPointsEarned != null && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-1 font-semibold text-gray-900">
                    Points earned
                  </p>
                  <p>
                    {progressPointsEarned}
                    {progressTotalPoints != null
                      ? ` of ${progressTotalPoints}`
                      : ""}
                  </p>
                </div>
              )}
              {progressScore != null && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-1 font-semibold text-gray-900">Score</p>
                  <p>{Math.round(progressScore)}%</p>
                </div>
              )}
              {progressLastAttemptAt && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-1 font-semibold text-gray-900">
                    Last activity
                  </p>
                  <p>
                    {new Date(progressLastAttemptAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              )}

              {progressQuizDetails.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-500">
                    Quiz activity
                  </p>
                  <ul className="mt-3 space-y-3">
                    {progressQuizDetails.map((detail, index) => {
                      const questionRaw = detail["question"];
                      const question =
                        typeof questionRaw === "string"
                          ? questionRaw
                          : undefined;
                      const truncatedQuestion =
                        question && question.length > 110
                          ? `${question.slice(0, 107)}…`
                          : question;
                      const attempted =
                        typeof detail["attempted"] === "boolean"
                          ? detail["attempted"]
                          : undefined;
                      const isCorrect =
                        typeof detail["is_correct"] === "boolean"
                          ? detail["is_correct"]
                          : undefined;
                      const pointsEarnedForQuiz =
                        typeof detail["points_earned"] === "number"
                          ? detail["points_earned"]
                          : undefined;
                      const quizPoints =
                        typeof detail["points"] === "number"
                          ? detail["points"]
                          : undefined;
                      const attemptedAt =
                        typeof detail["attempted_at"] === "string"
                          ? detail["attempted_at"]
                          : undefined;

                      return (
                        <li
                          key={`progress-quiz-${index}`}
                          className="rounded-xl border border-secondary-100 bg-white p-3"
                        >
                          <p className="text-sm font-semibold text-primary-900">
                            {truncatedQuestion || `Quiz ${index + 1}`}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary-600">
                            {attempted != null && (
                              <span>
                                {attempted ? "Attempted" : "Not attempted"}
                              </span>
                            )}
                            {isCorrect != null && (
                              <span
                                className={
                                  isCorrect
                                    ? "text-success-600"
                                    : "text-error-600"
                                }
                              >
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            )}
                            {(pointsEarnedForQuiz != null ||
                              quizPoints != null) && (
                              <span>
                                Points: {pointsEarnedForQuiz ?? 0}
                                {quizPoints != null ? ` / ${quizPoints}` : ""}
                              </span>
                            )}
                            {attemptedAt && (
                              <span>
                                {new Date(attemptedAt).toLocaleString(
                                  undefined,
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }
                                )}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Progress data unavailable for this section.
            </p>
          )}
        </div>
      )}

      {isQuizzesLoading ? (
        <div className="card text-center text-secondary-500">
          Loading quizzes...
        </div>
      ) : quizzesError ? (
        <div className="card text-center text-error-600">{quizzesError}</div>
      ) : totalQuizzes === 0 ? (
        <div className="card text-center text-secondary-500">
          No quizzes are available for this section yet. Check back soon!
        </div>
      ) : (
        <>
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary-500">
                  Question {currentIndex + 1} of {totalQuizzes}
                </p>
                {currentQuiz?.points != null && (
                  <p className="text-sm text-secondary-600">
                    {currentQuiz.points} point
                    {currentQuiz.points === 1 ? "" : "s"} · {currentQuiz.type}
                  </p>
                )}
              </div>
              <p className="text-sm text-secondary-600">
                {Math.round(progressPercentage)}% complete
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {quizzes.map((quiz, index) => {
                const isActive = index === currentIndex;
                const hasAttempts =
                  Array.isArray(quizAttempts[quiz.id]) &&
                  quizAttempts[quiz.id].length > 0;
                const isCompleted = submittedMap[quiz.id] || hasAttempts;
                const baseClasses =
                  "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300";

                const className = isActive
                  ? `${baseClasses} border-primary-500 bg-primary-50 text-primary-700 shadow-soft`
                  : isCompleted
                  ? `${baseClasses} border-success-200 bg-success-50 text-success-700 hover:border-success-300`
                  : `${baseClasses} border-secondary-200 text-secondary-500 hover:border-primary-200`;

                return (
                  <button
                    key={quiz.id}
                    type="button"
                    className={className}
                    onClick={() => setCurrentIndex(index)}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    {isCompleted && !isActive ? "✓" : index + 1}
                  </button>
                );
              })}
            </nav>
            <div className="h-1.5 w-full rounded-full bg-secondary-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {currentQuiz && (
            <div className="card space-y-5">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-secondary-500">
                  Step {currentIndex + 1}
                </p>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {currentQuiz.question}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentQuiz.type === "open"
                    ? "Open-ended response"
                    : "Multiple choice"}
                </p>
              </header>

              {(() => {
                const isMultipleChoice =
                  currentQuiz.is_multiple_choice ??
                  currentQuiz.type === "closed";
                if (isMultipleChoice && currentQuiz.options) {
                  return (
                    <div className="space-y-2">
                      {currentQuiz.options.map((option) => (
                        <label
                          key={`${currentQuiz.id}-${option}`}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 transition hover:border-primary-200"
                        >
                          <input
                            type="radio"
                            name={`quiz-${currentQuizId}`}
                            value={option}
                            checked={currentAnswer === option}
                            onChange={(event) =>
                              handleAnswerChange(
                                currentQuizId,
                                event.target.value
                              )
                            }
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-gray-700">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                }
                return (
                  <textarea
                    className="input-field"
                    rows={5}
                    placeholder="Type your answer here..."
                    value={currentAnswer}
                    onChange={(event) =>
                      handleAnswerChange(currentQuizId, event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                );
              })()}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="btn-secondary sm:w-auto"
                    onClick={() =>
                      setCurrentIndex((index) => Math.max(0, index - 1))
                    }
                    disabled={currentIndex === 0 || isSubmitting}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-primary sm:w-auto"
                    onClick={() => handleSubmit(currentQuiz)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isLastQuestion
                      ? "Submit & finish"
                      : "Submit & continue"}
                  </button>
                </div>
                {currentStatus.message && (
                  <span
                    className={`text-sm ${
                      currentStatus.state === "success"
                        ? "text-success-600"
                        : currentStatus.state === "error"
                        ? "text-error-600"
                        : "text-secondary-600"
                    }`}
                  >
                    {currentStatus.message}
                  </span>
                )}
              </div>

              {(() => {
                const attemptsForQuiz = quizAttempts[currentQuiz.id] || [];
                if (!attemptsForQuiz.length) return null;
                return (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Recent attempts
                    </p>
                    <ul className="space-y-2">
                      {attemptsForQuiz.map((attempt, index) => {
                        const record = attempt as Record<string, unknown>;
                        const score =
                          typeof record.score === "number"
                            ? record.score
                            : typeof record.percentage === "number"
                            ? record.percentage
                            : undefined;
                        const isCorrect =
                          typeof record.is_correct === "boolean"
                            ? record.is_correct
                            : undefined;
                        const submittedAt =
                          typeof record.submitted_at === "string"
                            ? record.submitted_at
                            : typeof record.created_at === "string"
                            ? record.created_at
                            : undefined;

                        return (
                          <li
                            key={`attempt-${currentQuiz.id}-${index}`}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-600"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {score != null && (
                                <span className="font-semibold text-gray-800">
                                  Score: {Math.round(Number(score))}%
                                </span>
                              )}
                              {isCorrect != null && (
                                <span
                                  className={
                                    isCorrect
                                      ? "text-success-600"
                                      : "text-error-600"
                                  }
                                >
                                  {isCorrect ? "Correct" : "Incorrect"}
                                </span>
                              )}
                              {submittedAt && (
                                <span>
                                  {new Date(submittedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <pre className="mt-2 bg-white border border-gray-200 rounded p-2 whitespace-pre-wrap break-words text-[11px] text-gray-500">
                              {JSON.stringify(record, null, 2)}
                            </pre>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              {currentStatus.state === "success" && currentQuiz.explanation && (
                <div className="rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700">
                  <strong className="block font-semibold mb-1">
                    Explanation
                  </strong>
                  <p>{currentQuiz.explanation}</p>
                </div>
              )}
            </div>
          )}

          {totalQuizzes > 0 && completedCount === totalQuizzes && (
            <div className="card border border-success-200 bg-success-50 text-success-700">
              <h3 className="text-lg font-semibold">
                All steps completed — fantastic work!
              </h3>
              <p className="mt-1 text-sm">
                Review any question above or continue to the next lesson when
                you’re ready.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleNavigateToSection}
                >
                  Back to section
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNavigateToModule}
                >
                  Continue learning
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuizPage;
