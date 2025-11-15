import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { moduleApi, sectionApi, quizApi } from "../../services/alblearnApi";
import {
  Module,
  ModuleSection,
  ModuleQuiz,
  PaginatedResource,
} from "../../types/api";
import { ApiError } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import { LessonStep } from "../../types";
import {
  createEmptyLessonStep,
  normalizeLessonStep,
  resolveLessonSteps,
  serializeLessonSteps,
} from "../../utils/lesson";

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

interface SectionFormProps {
  moduleSlug: string;
  section?: ModuleSection;
  onSaved: (section: ModuleSection, mode: "create" | "update") => void;
  onClose: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({
  moduleSlug,
  section,
  onSaved,
  onClose,
}) => {
  const isEditing = Boolean(section);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: section?.title ?? "",
    description: section?.description ?? "",
    orderNumber:
      section?.order_number !== undefined && section?.order_number !== null
        ? String(section.order_number)
        : "",
    points:
      section?.points !== undefined && section?.points !== null
        ? String(section.points)
        : "",
    isPublished: section?.is_published ?? false,
  });
  const initialSteps = useMemo<LessonStep[]>(() => {
    if (!section) {
      return [createEmptyLessonStep()];
    }

    const parsed = resolveLessonSteps(
      section.lesson_steps,
      section.content ?? null
    );

    if (parsed.length === 0) {
      const rawContent = section.content?.trim();
      if (rawContent) {
        return [
          {
            id: createEmptyLessonStep().id,
            title: section.title ? `${section.title} – lesson` : "Lesson step",
            content: rawContent,
            type: "instruction",
          },
        ];
      }
      return [createEmptyLessonStep()];
    }

    return parsed;
  }, [section]);
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>(initialSteps);

  useEffect(() => {
    setLessonSteps(initialSteps);
  }, [initialSteps]);

  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isPublished: event.target.checked }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }

    const normalizedSteps = lessonSteps.map(normalizeLessonStep);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      lesson_steps: normalizedSteps,
      content: serializeLessonSteps(normalizedSteps),
      order_number: formData.orderNumber
        ? Number(formData.orderNumber)
        : undefined,
      points: formData.points ? Number(formData.points) : undefined,
      is_published: formData.isPublished,
    };

    setIsSubmitting(true);

    try {
      const isUpdate = Boolean(section);
      const response = isUpdate
        ? await sectionApi.update(moduleSlug, section!.id, payload)
        : await sectionApi.create(moduleSlug, payload);
      const savedSection = response.data;

      onSaved(savedSection, isUpdate ? "update" : "create");

      if (isUpdate) {
        const updatedSteps = resolveLessonSteps(
          savedSection.lesson_steps,
          savedSection.content ?? null
        );

        setLessonSteps(
          updatedSteps.length > 0 ? updatedSteps : [createEmptyLessonStep()]
        );

        setFormData({
          title: savedSection.title ?? "",
          description: savedSection.description ?? "",
          orderNumber:
            savedSection.order_number !== undefined &&
            savedSection.order_number !== null
              ? String(savedSection.order_number)
              : "",
          points:
            savedSection.points !== undefined && savedSection.points !== null
              ? String(savedSection.points)
              : "",
          isPublished: Boolean(savedSection.is_published),
        });
      } else {
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Unable to save section. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {isEditing ? "Edit Section" : "Create New Section"}
        </h3>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              required
              className="input-field"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="input-field"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  Lesson steps
                </h4>
                <p className="text-xs text-gray-500">
                  Build this lesson as a sequence of steps. Students progress
                  through them one by one.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setLessonSteps((prev) => [...prev, createEmptyLessonStep()])
                }
              >
                Add step
              </button>
            </div>

            {lessonSteps.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No steps yet. Use “Add step” to begin structuring this lesson.
              </div>
            )}

            {lessonSteps.map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Step title
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={step.title}
                        onChange={(event) =>
                          setLessonSteps((prev) =>
                            prev.map((item) =>
                              item.id === step.id
                                ? { ...item, title: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="e.g. Greetings introduction"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Step content
                      </label>
                      <textarea
                        rows={4}
                        className="input-field"
                        value={step.content}
                        onChange={(event) =>
                          setLessonSteps((prev) =>
                            prev.map((item) =>
                              item.id === step.id
                                ? { ...item, content: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Write the dialogue, explanation, or practice prompt for this step."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:w-40">
                    <label className="block text-xs font-semibold text-gray-600">
                      Step type
                    </label>
                    <select
                      className="input-field"
                      value={step.type}
                      onChange={(event) =>
                        setLessonSteps((prev) =>
                          prev.map((item) =>
                            item.id === step.id
                              ? {
                                  ...item,
                                  type: event.target
                                    .value as LessonStep["type"],
                                }
                              : item
                          )
                        )
                      }
                    >
                      <option value="instruction">Instruction</option>
                      <option value="practice">Practice prompt</option>
                      <option value="media">Media / audio</option>
                    </select>

                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        onClick={() => {
                          if (index === 0) return;
                          setLessonSteps((prev) => {
                            const next = [...prev];
                            const temp = next[index - 1];
                            next[index - 1] = next[index];
                            next[index] = temp;
                            return next;
                          });
                        }}
                        disabled={index === 0}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        onClick={() => {
                          if (index === lessonSteps.length - 1) return;
                          setLessonSteps((prev) => {
                            const next = [...prev];
                            const temp = next[index + 1];
                            next[index + 1] = next[index];
                            next[index] = temp;
                            return next;
                          });
                        }}
                        disabled={index === lessonSteps.length - 1}
                      >
                        Move down
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() =>
                        setLessonSteps((prev) =>
                          prev.filter((item) => item.id !== step.id)
                        )
                      }
                      disabled={lessonSteps.length === 1}
                    >
                      Remove step
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order number
              </label>
              <input
                type="number"
                name="orderNumber"
                className="input-field"
                value={formData.orderNumber}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning points
              </label>
              <input
                type="number"
                name="points"
                className="input-field"
                value={formData.points}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={handleToggle}
            />
            Mark as published
          </label>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface QuizManagerProps {
  section: ModuleSection;
  onClose: () => void;
  onChanged: () => void;
}

type QuizFormMode = "create" | "edit";

const emptyQuizForm = {
  question: "",
  type: "multiple_choice" as "multiple_choice" | "open_ended",
  options: "",
  correctAnswer: "",
  explanation: "",
  points: "",
  orderNumber: "",
};

const QuizManager: React.FC<QuizManagerProps> = ({
  section,
  onClose,
  onChanged,
}) => {
  const [quizzes, setQuizzes] = useState<ModuleQuiz[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<QuizFormMode>("create");
  const [formData, setFormData] = useState({ ...emptyQuizForm });
  const [editingQuiz, setEditingQuiz] = useState<ModuleQuiz | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadQuizzes = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await quizApi.listForSection(section.id, {
        published_only: false,
      });
      const data = response.data;
      setQuizzes(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to load quizzes for this section.";
      setError(message);
      setStatus("error");
      setQuizzes([]);
    }
  }, [section.id]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const resetForm = () => {
    setFormData({ ...emptyQuizForm });
    setFormMode("create");
    setEditingQuiz(null);
  };

  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toOptionArray = (value: string) =>
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const buildPayload = () => {
    const isMultipleChoice = formData.type === "multiple_choice";
    const options = isMultipleChoice
      ? toOptionArray(formData.options)
      : undefined;

    const payload: Partial<ModuleQuiz> & {
      section_id: string;
    } = {
      section_id: section.id,
      question: formData.question.trim(),
      type: isMultipleChoice ? "closed" : "open",
      points: formData.points ? Number(formData.points) : undefined,
      explanation: formData.explanation.trim() || undefined,
      options,
      correct_answer: formData.correctAnswer.trim() || undefined,
      order_number: formData.orderNumber
        ? Number(formData.orderNumber)
        : undefined,
      is_multiple_choice: isMultipleChoice,
      is_open_ended: !isMultipleChoice,
    };

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (!formData.question.trim()) {
      setFeedback({ type: "error", message: "A question is required." });
      return;
    }

    if (formData.type === "multiple_choice" && !formData.options.trim()) {
      setFeedback({
        type: "error",
        message:
          "Provide at least one answer option for multiple choice quizzes.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (formMode === "edit" && editingQuiz) {
        await quizApi.update(editingQuiz.id, buildPayload());
        setFeedback({ type: "success", message: "Quiz updated successfully." });
      } else {
        await quizApi.create(buildPayload());
        setFeedback({ type: "success", message: "Quiz created successfully." });
      }

      await loadQuizzes();
      resetForm();
      onChanged();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to save quiz. Please try again.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (quiz: ModuleQuiz) => {
    setFormMode("edit");
    setEditingQuiz(quiz);
    setFormData({
      question: quiz.question,
      type:
        quiz.is_multiple_choice || quiz.type === "closed"
          ? "multiple_choice"
          : "open_ended",
      options: (quiz.options || []).join("\n"),
      correctAnswer: quiz.correct_answer || "",
      explanation: quiz.explanation || "",
      points: quiz.points != null ? String(quiz.points) : "",
      orderNumber: quiz.order_number != null ? String(quiz.order_number) : "",
    });
  };

  const handleRemove = async (quiz: ModuleQuiz) => {
    if (!window.confirm("Delete this quiz?")) return;
    setFeedback(null);

    try {
      await quizApi.remove(quiz.id);
      await loadQuizzes();
      setFeedback({ type: "success", message: "Quiz deleted." });
      onChanged();
      if (editingQuiz?.id === quiz.id) {
        resetForm();
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to delete quiz. Please try again.";
      setFeedback({ type: "error", message });
    }
  };

  const handleClose = () => {
    resetForm();
    setFeedback(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Manage quizzes</h3>
            <p className="text-sm text-gray-500">
              Section {section.order_number ?? ""} · {section.title}
            </p>
          </div>
          <button
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        {feedback && (
          <div
            className={`${
              feedback.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            } border px-4 py-2 rounded text-sm`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">
              {formMode === "edit" ? "Edit quiz" : "Create a new quiz"}
            </h4>
            {formMode === "edit" && (
              <button
                type="button"
                className="text-sm text-secondary-600 hover:text-secondary-900"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel editing
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <textarea
                name="question"
                rows={3}
                className="input-field"
                value={formData.question}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz type
                </label>
                <select
                  name="type"
                  className="input-field"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="open_ended">Open ended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points (optional)
                </label>
                <input
                  type="number"
                  name="points"
                  min={0}
                  className="input-field"
                  value={formData.points}
                  onChange={handleChange}
                />
              </div>
            </div>

            {formData.type === "multiple_choice" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Answer options (one per line)
                  </label>
                  <textarea
                    name="options"
                    rows={4}
                    className="input-field"
                    value={formData.options}
                    onChange={handleChange}
                    placeholder={"Answer A\nAnswer B\nAnswer C"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct answer
                  </label>
                  <input
                    type="text"
                    name="correctAnswer"
                    className="input-field"
                    value={formData.correctAnswer}
                    onChange={handleChange}
                    placeholder="Match one of the options"
                  />
                </div>
              </div>
            )}

            {formData.type === "open_ended" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference answer (optional)
                </label>
                <textarea
                  name="correctAnswer"
                  rows={3}
                  className="input-field"
                  value={formData.correctAnswer}
                  onChange={handleChange}
                  placeholder="Provide guidance for graders"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explanation (optional)
                </label>
                <textarea
                  name="explanation"
                  rows={3}
                  className="input-field"
                  value={formData.explanation}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order number (optional)
                </label>
                <input
                  type="number"
                  name="orderNumber"
                  min={0}
                  className="input-field"
                  value={formData.orderNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : formMode === "edit"
                ? "Update quiz"
                : "Create quiz"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Reset form
            </button>
          </div>
        </form>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">
              Existing quizzes
            </h4>
            <span className="text-sm text-gray-500">
              {quizzes.length} total
            </span>
          </div>

          {status === "loading" && (
            <div className="text-sm text-gray-500">Loading quizzes...</div>
          )}

          {status === "error" && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {status === "ready" && quizzes.length === 0 && (
            <div className="text-sm text-gray-500">No quizzes created yet.</div>
          )}

          {status === "ready" && quizzes.length > 0 && (
            <div className="space-y-3">
              {quizzes
                .slice()
                .sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0))
                .map((quiz) => (
                  <div
                    key={quiz.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900">
                          {quiz.question}
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Type: {quiz.type} · Points: {quiz.points ?? 0}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary text-xs"
                          onClick={() => handleEditClick(quiz)}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleRemove(quiz)}
                          disabled={isSubmitting}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {quiz.options && quiz.options.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <p className="font-semibold text-gray-700">Options:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {quiz.options.map((option) => (
                            <li key={option}>
                              {option}
                              {quiz.correct_answer === option && (
                                <span className="ml-2 text-green-600 font-medium">
                                  (correct)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {quiz.explanation && (
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold">Explanation:</span>{" "}
                        {quiz.explanation}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ModuleEditor: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const viewMode = searchParams.get("view");
  const sectionIdParam = searchParams.get("sectionId");
  const { state } = useAuth();
  const instructorUserId = normalizeId(state.user?.id);
  const isInstructor = state.user?.role === "instructor";
  const [module, setModule] = useState<Module | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [isLoadingModule, setIsLoadingModule] = useState<boolean>(true);

  const [sections, setSections] = useState<ModuleSection[]>([]);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(true);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<ModuleSection | null>(
    null
  );
  const [quizManagerSection, setQuizManagerSection] =
    useState<ModuleSection | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const handledSectionParamRef = useRef<string | null>(null);

  const openSectionModal = useCallback(
    (section: ModuleSection) => {
      if (!slug) return;

      navigate(
        `/instructor/modules/${slug}?view=sections&sectionId=${section.id}`
      );
      setEditingSection(section);
      setShowSectionModal(true);
    },
    [navigate, slug]
  );

  const clearViewParams = useCallback(() => {
    if (!slug) return;
    if (!viewMode && !sectionIdParam) return;
    const params = new URLSearchParams(location.search);
    params.delete("view");
    params.delete("sectionId");
    const search = params.toString();
    navigate(`/instructor/modules/${slug}${search ? `?${search}` : ""}`, {
      replace: true,
    });
  }, [navigate, slug, location.search, viewMode, sectionIdParam]);

  const loadModule = useCallback(async () => {
    if (!slug) {
      setModuleError("Module identifier is missing.");
      setIsLoadingModule(false);
      setIsLoadingSections(false);
      return;
    }

    setIsLoadingModule(true);
    setModuleError(null);
    try {
      const response = await moduleApi.getBySlug(slug);
      const loadedModule = response.data;
      const moduleInstructorId =
        normalizeId(loadedModule.instructor_id) ??
        normalizeId(loadedModule.instructor?.id) ??
        null;

      if (isInstructor) {
        if (!moduleInstructorId) {
          setModuleError(
            "This module is not yet assigned to you. Please contact an administrator."
          );
          setModule(null);
          return;
        }

        if (
          instructorUserId &&
          moduleInstructorId !== normalizeId(instructorUserId)
        ) {
          setModuleError("This module is assigned to a different instructor.");
          setModule(null);
          return;
        }
      }

      setModule(loadedModule);
    } catch (err) {
      if (err instanceof ApiError) {
        setModuleError(err.message);
      } else {
        setModuleError("Failed to load module details.");
      }
    } finally {
      setIsLoadingModule(false);
    }
  }, [slug, instructorUserId, isInstructor]);

  const loadSections = useCallback(async () => {
    if (!slug) {
      setSectionsError("Module identifier is missing.");
      setIsLoadingSections(false);
      return;
    }

    setIsLoadingSections(true);
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
      if (err instanceof ApiError) {
        setSectionsError(err.message);
      } else {
        setSectionsError("Failed to load sections.");
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

  const orderedSections = useMemo(
    () =>
      [...sections].sort(
        (a, b) => (a.order_number ?? 0) - (b.order_number ?? 0)
      ),
    [sections]
  );

  useEffect(() => {
    if (
      viewMode === "quizzes" &&
      orderedSections.length > 0 &&
      !quizManagerSection
    ) {
      const target = sectionIdParam
        ? orderedSections.find(
            (section) => String(section.id) === sectionIdParam
          )
        : orderedSections[0];
      if (target) {
        setQuizManagerSection(target);
      }
    }
  }, [viewMode, orderedSections, quizManagerSection, sectionIdParam]);

  useEffect(() => {
    if (viewMode === "sections" && sectionIdParam) {
      if (handledSectionParamRef.current === sectionIdParam) {
        return;
      }

      const target =
        orderedSections.length > 0
          ? orderedSections.find(
              (section) => String(section.id) === sectionIdParam
            ) ?? orderedSections[0]
          : undefined;

      if (target) {
        handledSectionParamRef.current = sectionIdParam;
        setEditingSection(target);
        setShowSectionModal(true);
      }
    } else {
      handledSectionParamRef.current = null;
    }
  }, [viewMode, orderedSections, sectionIdParam]);

  useEffect(() => {
    if (!showSectionModal || !sectionIdParam) {
      return;
    }

    const updated = orderedSections.find(
      (section) => String(section.id) === sectionIdParam
    );

    if (updated) {
      setEditingSection(updated);
    }
  }, [orderedSections, showSectionModal, sectionIdParam]);

  useEffect(() => {
    if (viewMode === "sections" && !sectionIdParam) {
      setEditingSection(null);
      setShowSectionModal(true);
    }
  }, [viewMode, sectionIdParam]);

  const handleCloseSectionModal = useCallback(() => {
    setShowSectionModal(false);
    setEditingSection(null);
    clearViewParams();
  }, [clearViewParams]);

  const handleCloseQuizManager = useCallback(() => {
    setQuizManagerSection(null);
    clearViewParams();
  }, [clearViewParams]);

  const handleSectionSaved = async (
    savedSection: ModuleSection,
    mode: "create" | "update"
  ) => {
    if (mode === "update") {
      setEditingSection(savedSection);
    }

    await loadSections();
    setFeedback({
      type: "success",
      message:
        mode === "create"
          ? "Section created successfully."
          : "Section updated successfully.",
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!slug) return;
    const confirm = window.confirm(
      "Are you sure you want to delete this section?"
    );
    if (!confirm) return;

    try {
      await sectionApi.remove(slug, sectionId);
      await loadSections();
      setFeedback({
        type: "success",
        message: "Section deleted successfully.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to delete section. Please try again.";
      setFeedback({ type: "error", message });
    }
  };

  if (isLoadingModule) {
    return <LoadingSpinner />;
  }

  if (moduleError) {
    return (
      <div className="px-4 py-6">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to load module
          </h2>
          <p className="text-gray-600 mb-4">{moduleError}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go back
          </button>
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
            Please return to the dashboard and select a different module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {feedback && (
        <div
          className={`border px-4 py-3 rounded-lg text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
          <p className="text-gray-600 mt-2">
            Build out this module with structured sections and quizzes.
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Module Overview
          </h2>
          <dl className="space-y-4 text-sm text-gray-600">
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Status</dt>
              <dd className="col-span-2 capitalize">
                {module.status || "draft"}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Level</dt>
              <dd className="col-span-2 capitalize">{module.level || "All"}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Lessons</dt>
              <dd className="col-span-2">{module.lessons_count ?? 0}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Duration</dt>
              <dd className="col-span-2">
                {module.duration_hours ?? "—"} hours
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Created</dt>
              <dd className="col-span-2">
                {new Date(module.created_at).toLocaleString()}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-900">Published</dt>
              <dd className="col-span-2">
                {module.published_at
                  ? new Date(module.published_at).toLocaleString()
                  : "Not published"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What's next?</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3">
              <p className="font-semibold text-primary-700">
                1. Outline lessons
              </p>
              <p className="text-xs text-primary-600 mt-1">
                Break each lesson into clear steps. Students move through them
                sequentially.
              </p>
            </div>
            <div className="rounded-lg border border-secondary-100 bg-secondary-50/60 p-3">
              <p className="font-semibold text-secondary-700">
                2. Add practice
              </p>
              <p className="text-xs text-secondary-600 mt-1">
                Use practice steps or attach quizzes to reinforce new vocabulary
                and grammar.
              </p>
            </div>
            <div className="rounded-lg border border-secondary-100 bg-secondary-50/40 p-3">
              <p className="font-semibold text-secondary-700">
                3. Preview the learner journey
              </p>
              <p className="text-xs text-secondary-600 mt-1">
                Switch to the student view to experience the flow before
                publishing.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sections</h2>
            <p className="text-sm text-gray-600">
              Create, publish, and maintain module sections and quizzes.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSection(null);
              setShowSectionModal(true);
            }}
            className="btn-primary"
          >
            Add new section
          </button>
        </div>

        {sectionsError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
            {sectionsError}
          </div>
        )}

        {isLoadingSections ? (
          <div className="text-center py-12 text-gray-500">
            Loading sections...
          </div>
        ) : orderedSections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No sections have been created yet. Start by adding your first
            section.
          </div>
        ) : (
          <div className="space-y-4">
            {orderedSections.map((section) => {
              const lessonSteps = resolveLessonSteps(
                section.lesson_steps,
                section.content ?? null
              );
              const firstStepSummary =
                lessonSteps[0]?.content?.slice(0, 160) ||
                "No lesson content yet.";
              const totalSteps = lessonSteps.length;

              return (
                <div
                  key={section.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSectionModal(section)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSectionModal(section);
                    }
                  }}
                  className="border border-gray-200 rounded-lg p-4 shadow-sm hover:border-primary-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {section.order_number
                            ? `#${section.order_number} · `
                            : ""}
                          {section.title}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            section.is_published
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {section.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {section.description || "No description provided."}
                      </p>
                      <p className="text-xs text-gray-500">
                        {section.points ?? 0} learning points ·{" "}
                        {section.total_quiz_points ?? 0} quiz points ·{" "}
                        {totalSteps} step{totalSteps === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {firstStepSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openSectionModal(section);
                      }}
                      className="btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(
                          `/instructor/modules/${module.slug}?view=quizzes&sectionId=${section.id}`
                        );
                        setQuizManagerSection(section);
                      }}
                      className="btn-secondary"
                    >
                      Manage quizzes
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                      className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSectionModal && slug && (
        <SectionForm
          moduleSlug={slug}
          section={editingSection || undefined}
          onSaved={handleSectionSaved}
          onClose={handleCloseSectionModal}
        />
      )}

      {quizManagerSection && (
        <QuizManager
          section={quizManagerSection}
          onClose={handleCloseQuizManager}
          onChanged={loadSections}
        />
      )}
    </div>
  );
};

export default ModuleEditor;
