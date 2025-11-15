import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { userApi, moduleApi, activityApi } from "../../services/alblearnApi";
import { ApiUser, ActivityEntry, ActivityStatistics } from "../../types/api";
import { mapApiUserToUser } from "../../utils/user";
import { User, UserStats, ModuleStats } from "../../types";
import { ApiError } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

const AdminDashboard: React.FC = () => {
  const { state } = useAuth();
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [studentTotal, setStudentTotal] = useState<number>(0);
  const [moduleTotal, setModuleTotal] = useState<number>(0);
  const [publishedTotal, setPublishedTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStats, setActivityStats] =
    useState<ActivityStatistics | null>(null);

  const isAdmin = state.user?.role === "admin";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersResponse, modulesResponse, publishedResponse] = await Promise.all([
        userApi.list({ per_page: 100 }),
        moduleApi.list({ per_page: 50 }),
        moduleApi.listPublished({ per_page: 50 }),
      ]);

      const allUsers = usersResponse.data.data;
      setApiUsers(allUsers);
      const studentCount = allUsers.filter((apiUser) =>
        mapApiUserToUser(apiUser).role === "student"
      ).length;
      setStudentTotal(studentCount);
      setModuleTotal(modulesResponse.data.meta.total);
      setPublishedTotal(publishedResponse.data.meta.total);

      if (isAdmin) {
        try {
          const activityResponse = await activityApi.list({ per_page: 5 });
          setActivities(activityResponse.data.data);
        } catch (activityErr) {
          if (activityErr instanceof ApiError && activityErr.status === 403) {
            const fallback = await activityApi.myActivities({ per_page: 5 });
            setActivities(fallback.data.data);
          } else {
            setActivities([]);
          }
        }

        try {
          const statsResponse = await activityApi.statistics();
          setActivityStats(statsResponse.data);
        } catch (statsErr) {
          console.error("Unable to load activity statistics", statsErr);
          setActivityStats(null);
        }
      } else {
        const fallback = await activityApi.myActivities({ per_page: 5 });
        setActivities(fallback.data.data);
        setActivityStats(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }

  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const users: User[] = useMemo(() => apiUsers.map(mapApiUserToUser), [apiUsers]);

  const userStats: UserStats = useMemo(() => {
    const students = users.filter((user) => user.role === "student");
    const activeStudents = students.length;
    const newStudentsThisMonth = students.filter((user) => {
      const createdDate = new Date(user.createdAt);
      const now = new Date();
      return (
        createdDate.getMonth() === now.getMonth() &&
        createdDate.getFullYear() === now.getFullYear()
      );
    }).length;

    const topLearners = [...students]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalStudents: studentTotal,
      activeStudents,
      newStudentsThisMonth,
      topLearners,
    };
  }, [users, studentTotal]);

  const moduleStats: ModuleStats = useMemo(() => {
    const completionRate = moduleTotal
      ? Math.min(100, (publishedTotal / moduleTotal) * 100)
      : 0;

    return {
      totalModules: moduleTotal,
      publishedModules: publishedTotal,
      completionRate,
      averageScore: 0,
    };
  }, [moduleTotal, publishedTotal]);

  const activityItems = useMemo(() =>
    activities.map((activity) => {
      const subject = activity.subject as { name?: string } | undefined;
      const timestamp = new Date(activity.created_at).toLocaleString();
      return {
        id: activity.id,
        description: activity.description || activity.event || "Activity",
        user: subject?.name || "System",
        timestamp,
      };
    }),
  [activities]);

  return (
    <div className="px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor platform activity and manage AlbLearn resources.
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary w-full md:w-auto"
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : userStats.totalStudents}
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published Modules</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : moduleStats.publishedModules}
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Published / Total
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading
                  ? "–"
                  : `${moduleStats.publishedModules}/${moduleStats.totalModules}`}
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
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "–" : `${moduleStats.completionRate.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/users"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <span>Manage Users</span>
            </Link>

            <Link
              to="/admin/modules"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m0 0v2m-6-2v2m9-9h.01M4 7h.01M9 7h.01M14 7h.01M19 7h.01M4 12h.01M4 17h.01"
                />
              </svg>
              <span>Manage Modules</span>
            </Link>

            <Link
              to="/admin/modules?create=true"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Create New Module</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {activityItems.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity available.</p>
          ) : (
            <div className="space-y-4">
              {activityItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.user} · {item.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Activity analytics</h2>
          {activityStats ? (
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">Entries recorded:</span>{" "}
                {activityStats.total}
              </p>
              <div>
                <p className="font-semibold text-gray-900">By type</p>
                <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(activityStats.by_type, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Top users</p>
                <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(activityStats.by_user, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Activity statistics will appear after logs are collected.</p>
          )}

        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">New Users</h2>
        {userStats.topLearners.length === 0 ? (
          <p className="text-sm text-gray-500">No user data available.</p>
        ) : (
          <div className="space-y-3">
            {userStats.topLearners.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className="text-xs text-gray-500">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
