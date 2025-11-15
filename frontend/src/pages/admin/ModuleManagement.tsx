import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { moduleApi, userApi } from "../../services/alblearnApi";
import {
  Module,
  ModuleEnrollment,
  ModuleStatistics,
  ApiUser,
} from "../../types/api";
import { ApiError } from "../../services/apiClient";
import { mapApiUserToUser } from "../../utils/user";

type ModalStatus = "loading" | "ready" | "error";

interface ModuleStatsModal {
  module: Module;
  status: ModalStatus;
  data?: ModuleStatistics | null;
  error?: string;
}

interface ModuleEnrollmentsModal {
  module: Module;
  status: ModalStatus;
  data: ModuleEnrollment[];
  error?: string;
}

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

interface ModuleFormProps {
  module?: Module;
  onClose: () => void;
  onSaved: (module: Module) => void;
  onFeedback?: (feedback: { type: "success" | "error"; message: string }) => void;
}

const statusVariantMap: Record<string, "success" | "warning" | "neutral"> = {
  published: "success",
  draft: "warning",
};

const ModuleForm: React.FC<ModuleFormProps> = ({
  module,
  onClose,
  onSaved,
  onFeedback,
}) => {
  const isEditing = Boolean(module);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<ApiUser[]>([]);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: module?.title || "",
    shortDescription: module?.short_description || "",
    description: module?.description || "",
    level: module?.level || "beginner",
    status: module?.status || "draft",
    price: module?.price != null ? String(module.price) : module?.effective_price != null ? String(module.effective_price) : "",
    discountPrice: module?.discount_price != null ? String(module.discount_price) : "",
    durationHours: module?.duration_hours != null ? String(module.duration_hours) : "",
    lessonsCount: module?.lessons_count != null ? String(module.lessons_count) : "",
    tags: module?.tags ? module.tags.join(", ") : "",
    requirements: module?.requirements ? module.requirements.join("\n") : "",
    learningOutcomes: module?.learning_outcomes ? module.learning_outcomes.join("\n") : "",
    instructorId:
      normalizeId(module?.instructor_id) ?? normalizeId(module?.instructor?.id) ?? "",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadInstructors = async () => {
      setIsLoadingInstructors(true);
      setInstructorError(null);
      try {
        const response = await userApi.list({ per_page: 100 });
        const instructorUsers = response.data.data.filter((apiUser) => {
          const mapped = mapApiUserToUser(apiUser);
          return mapped.role === "instructor";
        });
        setInstructors(instructorUsers);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to load instructors.";
        setInstructorError(message);
        setInstructors([]);
      } finally {
        setIsLoadingInstructors(false);
      }
    };

    loadInstructors();
  }, []);

  const toArray = (value: string, delimiter: "comma" | "newline") => {
    if (!value.trim()) return undefined;
    const items =
      delimiter === "comma"
        ? value.split(",")
        : value.split("\n");
    const normalized = items.map((item) => item.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError("Title is required");
      return;
    }

    if (!formData.description.trim()) {
      setFormError("Description is required");
      return;
    }

    const payload: Partial<Module> & {
      short_description?: string;
      discount_price?: number | null;
      duration_hours?: number | null;
      lessons_count?: number | null;
      tags?: string[];
      requirements?: string[];
      learning_outcomes?: string[];
    } = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      short_description: formData.shortDescription.trim() || undefined,
      level: formData.level || undefined,
      status: formData.status,
      price: formData.price ? Number(formData.price) : undefined,
      discount_price: formData.discountPrice ? Number(formData.discountPrice) : undefined,
      duration_hours: formData.durationHours ? Number(formData.durationHours) : undefined,
      lessons_count: formData.lessonsCount ? Number(formData.lessonsCount) : undefined,
      tags: toArray(formData.tags, "comma"),
      requirements: toArray(formData.requirements, "newline"),
      learning_outcomes: toArray(formData.learningOutcomes, "newline"),
    };

    const trimmedInstructorId = formData.instructorId.trim();
    const desiredInstructorId = trimmedInstructorId === "" ? null : trimmedInstructorId;

    setIsSubmitting(true);

    try {
      let savedModule: Module;

      if (isEditing && module) {
        await moduleApi.update(module.slug, payload);
        const refreshed = await moduleApi.getBySlug(module.slug);
        savedModule = refreshed.data;
      } else {
        const created = await moduleApi.create(payload);
        savedModule = created.data;
      }

      const currentInstructorId =
        normalizeId(savedModule.instructor_id) ??
        normalizeId(savedModule.instructor?.id) ??
        null;

      if (desiredInstructorId !== currentInstructorId) {
        try {
          const assigned = await moduleApi.assignInstructor(
            savedModule.slug,
            desiredInstructorId
          );
          savedModule = assigned.data;
        } catch (assignErr) {
          const message =
            assignErr instanceof ApiError
              ? assignErr.message
              : "Unable to update instructor assignment.";
          setFormError(message);
          onFeedback?.({ type: "error", message });
          return;
        }
      }

      onSaved(savedModule);
      const baseSuccess = isEditing
        ? "Module updated successfully."
        : "Module created successfully.";
      const assignmentSuccess =
        desiredInstructorId !== currentInstructorId
          ? desiredInstructorId
            ? " Instructor assigned to module."
            : " Module is now unassigned."
          : "";
      onFeedback?.({ type: "success", message: `${baseSuccess}${assignmentSuccess}`.trim() });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to save module. Please try again.");
      }
      onFeedback?.({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to save module. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {isEditing ? "Edit Module" : "Create New Module"}
        </h3>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Level
              </label>
              <select
                name="level"
                className="input-field"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Description
            </label>
            <input
              type="text"
              name="shortDescription"
              className="input-field"
              value={formData.shortDescription}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              className="input-field"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                className="input-field"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor
              </label>
              <select
                name="instructorId"
                className="input-field"
                value={formData.instructorId}
                onChange={handleChange}
                disabled={isLoadingInstructors}
              >
                <option value="">Unassigned</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
              {instructorError && (
                <p className="mt-1 text-xs text-red-600">{instructorError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (optional)
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.price}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (optional)
              </label>
              <input
                type="number"
                name="discountPrice"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.discountPrice}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (hours)
              </label>
              <input
                type="number"
                name="durationHours"
                min="0"
                className="input-field"
                value={formData.durationHours}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lessons Count
              </label>
              <input
                type="number"
                name="lessonsCount"
                min="0"
                className="input-field"
                value={formData.lessonsCount}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                name="tags"
                className="input-field"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g. Albanian, Language"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requirements (one per line)
              </label>
              <textarea
                name="requirements"
                rows={3}
                className="input-field"
                value={formData.requirements}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Learning Outcomes (one per line)
            </label>
            <textarea
              name="learningOutcomes"
              rows={3}
              className="input-field"
              value={formData.learningOutcomes}
              onChange={handleChange}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-60"
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

const ModuleManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [statsModal, setStatsModal] = useState<ModuleStatsModal | null>(null);
  const [enrollmentsModal, setEnrollmentsModal] =
    useState<ModuleEnrollmentsModal | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Module | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "loading">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await moduleApi.list({ per_page: 50 });
      setModules(response.data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load modules. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    const shouldOpen = searchParams.get("create") === "true";
    if (shouldOpen) {
      setShowCreateModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const parseNumber = useCallback((value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const filteredModules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return modules.filter((module) => {
      const matchesSearch =
        !term ||
        module.title.toLowerCase().includes(term) ||
        (module.description || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || module.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [modules, searchTerm, statusFilter]);

  const formatPrice = (mod: Module) => {
    const raw = mod.effective_price ?? mod.price;
    const numeric =
      typeof raw === "number"
        ? raw
        : raw != null
        ? Number(raw)
        : NaN;

    if (Number.isFinite(numeric) && numeric > 0) {
      return `$${numeric.toFixed(2)}`;
    }

    return "Free";
  };

  const handleTogglePublish = async (module: Module) => {
    const nextStatus = module.status === "published" ? "draft" : "published";
    try {
      await moduleApi.update(module.slug, { status: nextStatus });
      const refreshed = await moduleApi.getBySlug(module.slug);
      setModules((prev) =>
        prev.map((item) => (item.id === module.id ? refreshed.data : item))
      );
    } catch (err) {
      // For now, surface a basic alert; could be replaced with toast
      alert("Failed to update module status.");
    }
  };

  const openStatsModal = async (module: Module) => {
    setStatsModal({ module, status: "loading" });
    try {
      const response = await moduleApi.statistics(module.slug);
      setStatsModal({
        module,
        status: "ready",
        data: response.data,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to load module statistics.";
      setStatsModal({ module, status: "error", data: null, error: message });
    }
  };

  const openEnrollmentsModal = async (module: Module) => {
    setEnrollmentsModal({ module, status: "loading", data: [] });
    try {
      const response = await moduleApi.enrollments(module.slug, {
        per_page: 100,
      });
      setEnrollmentsModal({
        module,
        status: "ready",
        data: response.data.data,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to load module enrollments.";
      setEnrollmentsModal({
        module,
        status: "error",
        data: [],
        error: message,
      });
    }
  };

  const handleDeleteModule = async () => {
    if (!pendingDeletion) return;
    setDeleteStatus("loading");
    setDeleteError(null);

    try {
      await moduleApi.remove(pendingDeletion.slug);
      setModules((prev) =>
        prev.filter((module) => module.id !== pendingDeletion.id)
      );
      setPendingDeletion(null);
      setDeleteStatus("idle");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to delete module. Please try again.";
      setDeleteError(message);
      setDeleteStatus("idle");
    }
  };

  const formatStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Module Management</h1>
          <p className="text-gray-600">
            Create, publish, and maintain AlbLearn modules.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchModules}
            className="btn-secondary"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Add New Module
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 border px-4 py-3 rounded flex items-start justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span className="text-sm font-medium leading-snug">
            {feedback.message}
          </span>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search modules..."
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "published" | "draft")
            }
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <div className="flex items-center text-sm text-gray-500">
            Showing {filteredModules.length} of {modules.length} modules
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instructor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    Loading modules...
                  </td>
                </tr>
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No modules found.
                  </td>
                </tr>
              ) : (
                filteredModules.map((module) => (
                  <tr key={module.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {module.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {module.short_description || "No summary provided."}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {module.instructor?.name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        label={formatStatus(module.status)}
                        variant={statusVariantMap[module.status] || "neutral"}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {module.level || "n/a"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(module)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(module.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-primary-600 hover:text-primary-900"
                          onClick={() => setEditingModule(module)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-secondary-600 hover:text-secondary-900"
                          onClick={() => handleTogglePublish(module)}
                        >
                          {module.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          className="text-secondary-600 hover:text-secondary-900"
                          onClick={() => openStatsModal(module)}
                        >
                          Stats
                        </button>
                        <button
                          className="text-secondary-600 hover:text-secondary-900"
                          onClick={() => openEnrollmentsModal(module)}
                        >
                          Enrollments
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            setDeleteError(null);
                            setPendingDeletion(module);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statsModal && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Module statistics</h3>
                <p className="text-sm text-gray-500">{statsModal.module.title}</p>
              </div>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setStatsModal(null)}
              >
                Close
              </button>
            </div>

            {statsModal.status === "loading" && (
              <div className="text-sm text-gray-500">Loading statistics...</div>
            )}

            {statsModal.status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {statsModal.error || "Unable to load statistics."}
              </div>
            )}

            {statsModal.status === "ready" && statsModal.data && (
              <dl className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                {(() => {
                  const totalEnrollments = parseNumber(
                    statsModal.data.total_enrollments
                  );
                  const activeLearners = parseNumber(
                    statsModal.data.active_learners
                  );
                  const completionRate = parseNumber(
                    statsModal.data.completion_rate
                  );
                  const averageProgress = parseNumber(
                    statsModal.data.average_progress
                  );
                  const averageRating = parseNumber(
                    statsModal.data.average_rating
                  );
                  const totalReviews = parseNumber(
                    statsModal.data.total_reviews
                  );

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-900">
                          Total enrollments
                        </dt>
                        <dd>
                          {totalEnrollments != null
                            ? totalEnrollments.toLocaleString()
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-900">
                          Active learners
                        </dt>
                        <dd>
                          {activeLearners != null
                            ? activeLearners.toLocaleString()
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-900">
                          Completion rate
                        </dt>
                        <dd>
                          {completionRate != null
                            ? `${completionRate.toFixed(1)}%`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-900">
                          Average progress
                        </dt>
                        <dd>
                          {averageProgress != null
                            ? `${averageProgress.toFixed(1)}%`
                            : "—"}
                        </dd>
                      </div>
                      {averageRating != null && (
                        <div className="flex items-center justify-between">
                          <dt className="font-medium text-gray-900">
                            Average rating
                          </dt>
                          <dd>
                            {averageRating.toFixed(1)} · {" "}
                            {totalReviews != null
                              ? totalReviews.toLocaleString()
                              : 0}{" "}
                            reviews
                          </dd>
                        </div>
                      )}
                    </>
                  );
                })()}
              </dl>
            )}
          </div>
        </div>
      )}

      {enrollmentsModal && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Module enrollments</h3>
                <p className="text-sm text-gray-500">{enrollmentsModal.module.title}</p>
              </div>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setEnrollmentsModal(null)}
              >
                Close
              </button>
            </div>

            {enrollmentsModal.status === "loading" && (
              <div className="text-sm text-gray-500">Loading enrollments...</div>
            )}

            {enrollmentsModal.status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {enrollmentsModal.error || "Unable to load enrollments."}
              </div>
            )}

            {enrollmentsModal.status === "ready" && (
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">
                        Learner
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">
                        Enrolled
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrollmentsModal.data.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No enrollments yet.
                        </td>
                      </tr>
                    ) : (
                      enrollmentsModal.data.map((enrollment) => {
                        const learner = enrollment.user;
                        const progressValue = parseNumber(enrollment.progress);
                        return (
                          <tr key={enrollment.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {learner?.name || `User #${enrollment.user_id}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {learner?.email || "Email unavailable"}
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize text-gray-600">
                              {enrollment.status}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {progressValue != null
                                ? `${Math.round(progressValue)}%`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingDeletion && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete module</h3>
            <p className="text-sm text-gray-600">
              This will permanently remove "{pendingDeletion.title}" and all its sections.
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setPendingDeletion(null);
                  setDeleteError(null);
                }}
                disabled={deleteStatus === "loading"}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 border-red-700"
                onClick={handleDeleteModule}
                disabled={deleteStatus === "loading"}
              >
                {deleteStatus === "loading" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <ModuleForm
          onClose={() => setShowCreateModal(false)}
          onSaved={(createdModule) => {
            setModules((prev) => [createdModule, ...prev]);
          }}
          onFeedback={setFeedback}
        />
      )}

      {editingModule && (
        <ModuleForm
          module={editingModule}
          onClose={() => setEditingModule(null)}
          onSaved={(updatedModule) => {
            setModules((prev) =>
              prev.map((item) => (item.id === updatedModule.id ? updatedModule : item))
            );
            setEditingModule(null);
          }}
          onFeedback={setFeedback}
        />
      )}
    </div>
  );
};

export default ModuleManagement;
