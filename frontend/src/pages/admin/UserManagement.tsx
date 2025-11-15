import React, { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import { User, UserRole } from "../../types";
import { ApiUser } from "../../types/api";
import { userApi } from "../../services/alblearnApi";
import { ApiError } from "../../services/apiClient";
import {
  mapApiUserToUser,
  composeName,
} from "../../utils/user";
import { mapUserRoleToApiRole } from "../../utils/role";

const roleVariantMap: Record<UserRole, "success" | "info" | "warning"> = {
  admin: "warning",
  instructor: "info",
  student: "success",
};

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSaved: (user: ApiUser) => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSaved }) => {
  const isEditing = Boolean(user);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    role: (user?.role || "student") as UserRole,
    password: "",
    confirmPassword: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "role" ? (value as UserRole) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!formData.firstName.trim()) {
      setFormError("First name is required");
      return;
    }

    if (!formData.lastName.trim()) {
      setFormError("Last name is required");
      return;
    }

    if (!isEditing) {
      if (formData.password.length < 6) {
        setFormError("Password must be at least 6 characters long");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setFormError("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditing && user) {
        const name = composeName(formData.firstName, formData.lastName);
        await userApi.update(user.id, {
          name,
          email: formData.email,
        });

        if (formData.role !== user.role) {
          await userApi.assignRole(user.id, {
            role: mapUserRoleToApiRole(formData.role),
          });
        }

        const refreshed = await userApi.getById(user.id);
        onSaved(refreshed.data);
      } else {
        const name = composeName(formData.firstName, formData.lastName);

        const createPayload = {
          name,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
        };

        let newUser: ApiUser;

        if (formData.role === "instructor") {
          const created = await userApi.createInstructor(createPayload);
          newUser = created.data;
        } else {
          const created = await userApi.create(createPayload);
          newUser = created.data;

          if (formData.role !== "student") {
            await userApi.assignRole(newUser.id, {
              role: mapUserRoleToApiRole(formData.role),
            });
            const refreshed = await userApi.getById(newUser.id);
            newUser = refreshed.data;
          }
        }

        onSaved(newUser);
      }

      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-bold mb-4">
          {isEditing ? "Edit User" : "Create New User"}
        </h3>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                required
                className="input-field"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                required
                className="input-field"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="input-field"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="role"
              className="input-field"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {!isEditing && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="input-field"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    className="input-field"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long.
              </p>
            </>
          )}

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

const UserManagement: React.FC = () => {
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [roleManagerUser, setRoleManagerUser] = useState<ApiUser | null>(null);
  const [roleSelection, setRoleSelection] = useState<UserRole>("student");
  const [roleActionStatus, setRoleActionStatus] = useState<
    | { state: "idle" | "loading" | "error" | "success"; message?: string }
    | null
  >(null);
  const [userPendingDelete, setUserPendingDelete] = useState<ApiUser | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "loading">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userApi.list({ per_page: 50 });
      setApiUsers(response.data.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load users. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (userId: string) => {
    try {
      const refreshed = await userApi.getById(userId);
      setApiUsers((prev) => {
        const exists = prev.some((user) => user.id === userId);
        if (!exists) {
          return prev;
        }
        return prev.map((existing) =>
          existing.id === userId ? refreshed.data : existing
        );
      });
    } catch (refreshErr) {
      console.error("Unable to refresh user", refreshErr);
    }
  }, []);

  const handleAssignRole = useCallback(async () => {
    if (!roleManagerUser) return;
    setRoleActionStatus({ state: "loading" });

    try {
      await userApi.assignRole(roleManagerUser.id, {
        role: mapUserRoleToApiRole(roleSelection),
      });
      await refreshUser(roleManagerUser.id);
      const refreshed = await userApi.getById(roleManagerUser.id);
      setRoleManagerUser(refreshed.data);
      setRoleActionStatus({
        state: "success",
        message: "Role assigned successfully.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to assign role. Please try again.";
      setRoleActionStatus({ state: "error", message });
    }
  }, [roleManagerUser, roleSelection, refreshUser]);

  const handleRemoveRole = useCallback(
    async (role: string) => {
      if (!roleManagerUser) return;
      setRoleActionStatus({ state: "loading" });

      try {
        await userApi.removeRoleByName(roleManagerUser.id, role);
        await refreshUser(roleManagerUser.id);
        const refreshed = await userApi.getById(roleManagerUser.id);
        setRoleManagerUser(refreshed.data);
        setRoleActionStatus({
          state: "success",
          message: "Role removed successfully.",
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to remove role. Please try again.";
        setRoleActionStatus({ state: "error", message });
      }
    },
    [roleManagerUser, refreshUser]
  );

  const handleDeleteUser = useCallback(async () => {
    if (!userPendingDelete) return;
    setDeleteStatus("loading");
    setDeleteError(null);

    try {
      await userApi.remove(userPendingDelete.id);
      setApiUsers((prev) =>
        prev.filter((existing) => existing.id !== userPendingDelete.id)
      );
      setUserPendingDelete(null);
      setDeleteStatus("idle");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to delete user. Please try again.";
      setDeleteError(message);
      setDeleteStatus("idle");
    }
  }, [userPendingDelete]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (roleManagerUser) {
      setRoleSelection("student");
      setRoleActionStatus(null);
    }
  }, [roleManagerUser]);

  const users = useMemo(() => apiUsers.map(mapApiUserToUser), [apiUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleCreateSaved = (createdUser: ApiUser) => {
    setApiUsers((prev) => [createdUser, ...prev]);
  };

  const handleUpdateSaved = (updatedUser: ApiUser) => {
    setApiUsers((prev) =>
      prev.map((existing) =>
        existing.id === updatedUser.id ? updatedUser : existing
      )
    );
  };

  const availableRoles: UserRole[] = ["student", "instructor", "admin"];
  const selectedApiRole = mapUserRoleToApiRole(roleSelection);
  const currentRoles = roleManagerUser?.roles ?? [];
  const roleAlreadyAssigned = currentRoles.includes(selectedApiRole);
  const canRemoveRoles = currentRoles.length > 1;

  const readableRole = (role: string) => {
    if (role === "student") return "Student";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage user accounts, roles, and access across AlbLearn.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="btn-secondary"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="input-field"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">ID: {user.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        variant={roleVariantMap[user.role]}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-primary-600 hover:text-primary-900"
                          onClick={() =>
                            setEditingUser(
                              apiUsers.find(
                                (apiUser) => String(apiUser.id) === user.id
                              ) || null
                            )
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="text-secondary-600 hover:text-secondary-900"
                          onClick={() =>
                            setRoleManagerUser(
                              apiUsers.find(
                                (apiUser) => String(apiUser.id) === user.id
                              ) || null
                            )
                          }
                        >
                          Roles
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() =>
                            setUserPendingDelete(
                              apiUsers.find(
                                (apiUser) => String(apiUser.id) === user.id
                              ) || null
                            )
                          }
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

      {roleManagerUser && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Manage roles
                </h3>
                <p className="text-sm text-gray-500">
                  {roleManagerUser.name} · {roleManagerUser.email}
                </p>
              </div>
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setRoleManagerUser(null)}
                disabled={roleActionStatus?.state === "loading"}
              >
                Close
              </button>
            </div>

            {roleActionStatus?.message && (
              <div
                className={`${
                  roleActionStatus.state === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : roleActionStatus.state === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                } border px-4 py-2 rounded text-sm`}
              >
                {roleActionStatus.message}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Current roles
              </h4>
              {currentRoles.length === 0 ? (
                <p className="text-sm text-gray-500">No roles assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-2 text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                    >
                      {readableRole(role)}
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveRole(role)}
                        disabled={roleActionStatus?.state === "loading" || !canRemoveRoles}
                        title={
                          canRemoveRoles
                            ? "Remove role"
                            : "Users must have at least one role"
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Assign a new role
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="input-field"
                  value={roleSelection}
                  onChange={(event) =>
                    setRoleSelection(event.target.value as UserRole)
                  }
                  disabled={roleActionStatus?.state === "loading"}
                >
                  {availableRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {readableRole(mapUserRoleToApiRole(roleOption))}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignRole}
                  className="btn-primary"
                  disabled={
                    roleActionStatus?.state === "loading" || roleAlreadyAssigned
                  }
                  type="button"
                >
                  Assign role
                </button>
              </div>
              {roleAlreadyAssigned && (
                <p className="text-xs text-gray-500">
                  This user already has the selected role.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <UserForm
          onClose={() => setShowCreateModal(false)}
          onSaved={handleCreateSaved}
        />
      )}

      {editingUser && (
        <UserForm
          user={mapApiUserToUser(editingUser)}
          onClose={() => setEditingUser(null)}
          onSaved={handleUpdateSaved}
        />
      )}

      {userPendingDelete && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Remove user
            </h3>
            <p className="text-sm text-gray-600">
              This action will permanently delete {userPendingDelete.name} ({" "}
              {userPendingDelete.email}).
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
                  setDeleteError(null);
                  setUserPendingDelete(null);
                }}
                disabled={deleteStatus === "loading"}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 border-red-700"
                onClick={handleDeleteUser}
                disabled={deleteStatus === "loading"}
              >
                {deleteStatus === "loading" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
