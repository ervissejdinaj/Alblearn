import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  moduleApi,
  pointsApi,
  achievementsApi,
  progressApi,
  learningPathApi,
} from "../../services/alblearnApi";
import { Module } from "../../types/api";
import LottieIcon from "../../components/LottieIcon";
import learningAnimation from "../../assets/lottie/learning.json";
import { ApiError } from "../../services/apiClient";

const COLLECTION_KEYS = [
  "data",
  "items",
  "results",
  "achievements",
  "records",
  "entries",
  "list",
  "modules",
  "leaderboard",
  "accessible",
  "locked",
  "values",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractData = (input: unknown, visited = new Set<unknown>()): unknown => {
  if (input == null) return input;
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return input;

  if (visited.has(input)) {
    return input;
  }
  visited.add(input);

  const record = input as Record<string, unknown>;

  for (const key of COLLECTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const nested: unknown = record[key];
      if (nested !== input) {
        const resolved = extractData(nested, visited);
        if (resolved !== undefined) {
          return resolved;
        }
      }
    }
  }

  return record;
};

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
};

const hasMeaningfulData = (value: unknown): boolean => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
};

const findNumericValue = (value: unknown, keys: string[]): number | null => {
  const direct = coerceNumber(value);
  if (direct !== null) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findNumericValue(item, keys);
      if (nested !== null) return nested;
    }
    return null;
  }

  if (isRecord(value)) {
    for (const key of keys) {
      if (key in value) {
        const nested = findNumericValue(value[key], keys);
        if (nested !== null) return nested;
      }
    }
  }

  return null;
};

const ENABLE_LEARNING_PATH =
  (process.env.REACT_APP_ENABLE_LEARNING_PATH || "false")
    .toString()
    .toLowerCase() === "true";

const UserDashboard: React.FC = () => {
  const { state } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pointsSummary, setPointsSummary] = useState<unknown>(null);
  const [achievements, setAchievements] = useState<Record<string, unknown>[]>(
    []
  );
  const [unlockedAchievements, setUnlockedAchievements] =
    useState<unknown>(null);
  const [progressStats, setProgressStats] = useState<unknown>(null);
  const [leaderboard, setLeaderboard] = useState<unknown>(null);
  const [learningPath, setLearningPath] = useState<Module[]>([]);
  const [accessibleModules, setAccessibleModules] = useState<Module[]>([]);
  const [lockedModules, setLockedModules] = useState<Module[]>([]);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  // We silently handle partial insight failures; UI will only render what succeeds.
  const isStudent = state.user?.role === "student";

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await moduleApi.listPublished({ per_page: 30 });
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

  const sortedModules = useMemo(() => {
    if (!modules.length) return [];

    const getTimestamp = (mod: Module): number => {
      const candidate = mod.published_at ?? mod.created_at;
      if (!candidate) return Number.POSITIVE_INFINITY;
      const time = new Date(candidate).getTime();
      if (Number.isNaN(time)) {
        return Number.POSITIVE_INFINITY;
      }
      return time;
    };

    return [...modules].sort((a, b) => {
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;
      const titleA = a.title || "";
      const titleB = b.title || "";
      return titleA.localeCompare(titleB);
    });
  }, [modules]);

  useEffect(() => {
    const loadInsights = async () => {
      const baseResults = await Promise.allSettled([
        pointsApi.summary(),
        achievementsApi.list({ per_page: 20 }),
        achievementsApi.unlocked(),
        progressApi.stats(),
        progressApi.leaderboard({ limit: 10, period: "month" }),
      ]);

      const [
        pointsResult,
        achievementsResult,
        unlockedResult,
        progressResult,
        leaderboardResult,
      ] = baseResults;

      if (pointsResult.status === "fulfilled") {
        const resolved = extractData(pointsResult.value);
        setPointsSummary(resolved ?? null);
      } else {
        console.error("Failed to fetch points summary", pointsResult.reason);
        setPointsSummary(null);
      }

      if (achievementsResult.status === "fulfilled") {
        const resolved = extractData(achievementsResult.value);
        if (Array.isArray(resolved)) {
          const sanitized = resolved.filter(isRecord) as Record<
            string,
            unknown
          >[];
          setAchievements(sanitized);
        } else if (isRecord(resolved)) {
          setAchievements([resolved]);
        } else {
          setAchievements([]);
        }
      } else {
        setAchievements([]);
      }

      if (unlockedResult.status === "fulfilled") {
        const resolved = extractData(unlockedResult.value);
        if (Array.isArray(resolved)) {
          const sanitized = resolved.filter(isRecord) as Record<
            string,
            unknown
          >[];
          setUnlockedAchievements(sanitized);
        } else {
          setUnlockedAchievements(resolved ?? null);
        }
      } else {
        setUnlockedAchievements(null);
      }

      if (progressResult.status === "fulfilled") {
        const resolved = extractData(progressResult.value);
        setProgressStats(resolved ?? null);
      } else {
        setProgressStats(null);
      }

      if (leaderboardResult.status === "fulfilled") {
        const resolved = extractData(leaderboardResult.value);
        setLeaderboard(resolved ?? null);
      } else {
        setLeaderboard(null);
      }

      if (ENABLE_LEARNING_PATH) {
        const learningPathResults = await Promise.allSettled([
          learningPathApi.list(),
          learningPathApi.accessible({ per_page: 20 }),
          learningPathApi.locked({ per_page: 20 }),
        ]);

        const [pathResult, accessibleResult, lockedResult] =
          learningPathResults;

        if (pathResult.status === "fulfilled") {
          const resolved = extractData(pathResult.value);
          setLearningPath(
            Array.isArray(resolved) ? (resolved as Module[]) : []
          );
        } else {
          setLearningPath([]);
        }

        if (accessibleResult.status === "fulfilled") {
          const resolved = extractData(accessibleResult.value);
          setAccessibleModules(
            Array.isArray(resolved) ? (resolved as Module[]) : []
          );
        } else {
          setAccessibleModules([]);
        }

        if (lockedResult.status === "fulfilled") {
          const resolved = extractData(lockedResult.value);
          setLockedModules(
            Array.isArray(resolved) ? (resolved as Module[]) : []
          );
        } else {
          setLockedModules([]);
        }
      } else {
        setLearningPath([]);
        setAccessibleModules([]);
        setLockedModules([]);
      }

      // Partial failures are ignored; sections simply render empty states.
    };

    loadInsights();
  }, []);

  const recentModules = useMemo(
    () =>
      [...modules]
        .sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime()
        )
        .slice(0, 4),
    [modules]
  );

  const newModulesThisMonth = useMemo(() => {
    const now = new Date();
    return modules.filter((module) => {
      const publishedDate = new Date(module.published_at || module.created_at);
      return (
        publishedDate.getMonth() === now.getMonth() &&
        publishedDate.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [modules]);

  const totalPointsEarned = useMemo(() => {
    if (pointsSummary == null) return null;
    const candidate = extractData(pointsSummary);
    const value = findNumericValue(candidate, [
      "total_points",
      "points",
      "points_total",
      "score",
      "value",
    ]);
    return value;
  }, [pointsSummary]);

  const unlockedAchievementItems = useMemo(() => {
    if (Array.isArray(unlockedAchievements)) {
      return unlockedAchievements.filter(isRecord) as Record<string, unknown>[];
    }
    if (
      isRecord(unlockedAchievements) &&
      Object.keys(unlockedAchievements).length > 0
    ) {
      return [unlockedAchievements as Record<string, unknown>];
    }
    return [];
  }, [unlockedAchievements]);

  const normalizedProgressStats = useMemo(() => {
    if (!hasMeaningfulData(progressStats)) return null;
    if (Array.isArray(progressStats)) return progressStats;
    return progressStats;
  }, [progressStats]);

  const normalizedLeaderboard = useMemo(() => {
    if (!hasMeaningfulData(leaderboard)) return null;
    return leaderboard;
  }, [leaderboard]);

  const pickFirstString = (
    value: unknown,
    candidates: string[]
  ): string | undefined => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (isRecord(value)) {
      for (const key of candidates) {
        if (
          typeof value[key] === "string" &&
          (value[key] as string).trim().length > 0
        ) {
          return value[key] as string;
        }
      }
    }
    return undefined;
  };

  const renderRecordValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      const preview = value.slice(0, 3).map(renderRecordValue).join(", ");
      return value.length > 3 ? `${preview}, …` : preview;
    }
    if (isRecord(value)) {
      return Object.entries(value)
        .map(
          ([key, val]) => `${key.replace(/_/g, " ")}: ${renderRecordValue(val)}`
        )
        .join("; ");
    }
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value == null) return "–";
    return String(value);
  };

  const leaderboardEntries = useMemo(() => {
    if (!normalizedLeaderboard) return [] as Record<string, unknown>[];

    const collect = (input: unknown): Record<string, unknown>[] => {
      if (Array.isArray(input)) {
        return input.filter(isRecord) as Record<string, unknown>[];
      }
      if (isRecord(input)) {
        for (const key of ["leaderboard", "entries", "data", "items"]) {
          if (Array.isArray(input[key])) {
            return (input[key] as unknown[]).filter(isRecord) as Record<
              string,
              unknown
            >[];
          }
        }
      }
      return [];
    };

    return collect(normalizedLeaderboard);
  }, [normalizedLeaderboard]);

  const leaderboardMeta = useMemo(() => {
    if (!normalizedLeaderboard || Array.isArray(normalizedLeaderboard))
      return null;
    if (isRecord(normalizedLeaderboard)) {
      const metaCandidate = normalizedLeaderboard.meta;
      return isRecord(metaCandidate) ? metaCandidate : null;
    }
    return null;
  }, [normalizedLeaderboard]);

  const achievementBadges = useMemo(() => {
    return achievements.map((item, index) => {
      const title =
        pickFirstString(item, ["title", "name"]) || `Achievement #${index + 1}`;
      const description = pickFirstString(item, ["description", "details"]);
      const tier = pickFirstString(item, ["tier", "level"]);
      const points = findNumericValue(item, [
        "points",
        "reward_points",
        "value",
      ]);
      const icon = pickFirstString(item, ["icon", "emoji"]);
      return {
        id: item.id ?? `${title}-${index}`,
        title,
        description,
        tier,
        points,
        icon,
      };
    });
  }, [achievements]);

  const progressHighlightFields = useMemo(
    () => [
      {
        label: "Total points",
        keys: ["total_points", "points", "score"],
        suffix: "pts",
      },
      {
        label: "Completed modules",
        keys: ["completed_modules", "modules_completed"],
        suffix: "",
      },
      {
        label: "Completed sections",
        keys: ["completed_sections", "sections_completed"],
        suffix: "",
      },
      {
        label: "Quiz accuracy",
        keys: ["quiz_accuracy", "accuracy"],
        suffix: "%",
      },
      {
        label: "Learning streak",
        keys: ["current_streak", "streak_days"],
        suffix: "days",
      },
    ],
    []
  );

  const progressHighlights = useMemo(() => {
    if (!normalizedProgressStats)
      return [] as { label: string; value: string }[];

    return progressHighlightFields
      .map(({ label, keys, suffix }) => {
        const numeric = findNumericValue(normalizedProgressStats, keys);
        if (numeric === null) return null;
        const formatted =
          suffix === "%"
            ? `${Math.round(numeric)}${suffix}`
            : `${numeric.toLocaleString()}${suffix ? ` ${suffix}` : ""}`;
        return { label, value: formatted };
      })
      .filter(
        (item): item is { label: string; value: string } => item !== null
      );
  }, [normalizedProgressStats, progressHighlightFields]);

  const renderProgressHighlights = () => {
    if (progressHighlights.length === 0) {
      return (
        <p className="text-sm text-secondary-500">
          No progress insights yet. Start a module to see your learning trends.
        </p>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {progressHighlights.map((highlight) => (
          <div
            key={highlight.label}
            className="rounded-2xl border border-secondary-100 bg-gradient-to-br from-white via-secondary-50/60 to-white p-4 shadow-soft"
          >
            <p className="text-xs uppercase tracking-wide text-secondary-400">
              {highlight.label}
            </p>
            <p className="mt-2 text-lg font-bold text-secondary-900">
              {highlight.value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const AchievementsPanel: React.FC = () => (
    <div className="card space-y-6">
      <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-secondary-900">
              Achievements & rewards
            </h2>
            <p className="text-xs uppercase tracking-wide text-secondary-400">
              Celebrate milestones from your learning journey
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-100 rounded-full px-3 py-1">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 2a1 1 0 01.894.553l1.618 3.276 3.618.526a1 1 0 01.554 1.705l-2.617 2.553.618 3.6a1 1 0 01-1.451 1.054L10 13.347l-3.234 1.7a1 1 0 01-1.451-1.054l.618-3.6L3.316 8.06a1 1 0 01.554-1.705l3.618-.526L9.106 2.553A1 1 0 0110 2z" />
            </svg>
            {achievements.length} goals
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-secondary-700">
            Recent badges
          </h3>
          {unlockedAchievementItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unlockedAchievementItems.slice(0, 6).map((item, idx) => {
                const title =
                  pickFirstString(item, ["title", "name"]) ||
                  `Unlocked badge #${idx + 1}`;
                const description = pickFirstString(item, [
                  "description",
                  "details",
                ]);
                const awarded = item.created_at || item.unlocked_at;
                const points = findNumericValue(item, [
                  "points",
                  "reward_points",
                ]);
                const tier = pickFirstString(item, ["tier", "level"]);
                const icon = pickFirstString(item, ["icon", "emoji"]) || "🏅";
                return (
                  <div
                    key={`unlocked-${idx}`}
                    className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-white shadow-soft p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xl" aria-hidden>
                        {icon}
                      </span>
                      <div className="text-right">
                        {typeof awarded === "string" && (
                          <p className="text-[10px] uppercase tracking-wide text-primary-400">
                            {new Date(awarded).toLocaleDateString()}
                          </p>
                        )}
                        {tier && (
                          <span className="text-[11px] font-semibold text-primary-600 bg-primary-100/70 rounded-full px-2 py-0.5">
                            {tier}
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-primary-900">
                      {title}
                    </h4>
                    {description && (
                      <p className="mt-1 text-xs text-primary-700 leading-relaxed">
                        {description}
                      </p>
                    )}
                    {points != null && (
                      <p className="mt-2 text-xs font-semibold text-primary-600">
                        +{points.toLocaleString()} points
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-secondary-500">
              No achievements unlocked yet. Complete lessons and quizzes to earn
              rewards.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-secondary-700">
            All achievements
          </h3>
          {achievementBadges.length === 0 ? (
            <p className="text-sm text-secondary-500">
              No achievements available yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievementBadges.slice(0, 9).map((badge, index) => (
                <div
                  key={`achievement-${badge.id ?? index}`}
                  className="rounded-2xl border border-secondary-100 bg-white/80 backdrop-blur-sm p-4 shadow-soft hover:shadow-medium transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg">
                      {badge.icon || "🎖"}
                    </div>
                    {badge.points != null && (
                      <span className="text-xs font-semibold text-primary-600">
                        +{badge.points.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-secondary-900 line-clamp-2">
                    {badge.title}
                  </h4>
                  {badge.description && (
                    <p className="mt-1 text-xs text-secondary-600 leading-relaxed line-clamp-3">
                      {badge.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    </div>
  );

  const ProgressPanel: React.FC = () => (
    <div className="card space-y-4">
      <>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900">
            Progress insights
          </h2>
          <button
            className="text-xs text-secondary-500 hover:text-secondary-700"
            onClick={() => {
              progressApi
                .stats()
                .then((response) => setProgressStats(response.data))
                .catch((err) => console.error("Unable to refresh stats", err));
              progressApi
                .leaderboard({ limit: 10, period: "month" })
                .then((response) => setLeaderboard(response.data))
                .catch((err) =>
                  console.error("Unable to refresh leaderboard", err)
                );
            }}
          >
            Refresh
          </button>
        </div>

        {renderProgressHighlights()}

        {normalizedProgressStats && (
          <div className="rounded-2xl border border-secondary-100 bg-white/70 backdrop-blur-sm p-4 text-xs text-secondary-700">
            <button
              type="button"
              onClick={() => setIsStatsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-secondary-500 font-semibold"
            >
              <span>View detailed stats</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${
                  isStatsExpanded ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" />
              </svg>
            </button>
            {isStatsExpanded && (
              <div className="mt-3 space-y-1">
                {Array.isArray(normalizedProgressStats) ? (
                  normalizedProgressStats.map((item, idx) => (
                    <div key={`stat-${idx}`}>{renderRecordValue(item)}</div>
                  ))
                ) : isRecord(normalizedProgressStats) ? (
                  Object.entries(normalizedProgressStats).map(
                    ([key, value]) => (
                      <div key={key}>
                        <span className="font-semibold text-secondary-900">
                          {key.replace(/_/g, " ")}:
                        </span>{" "}
                        {renderRecordValue(value)}
                      </div>
                    )
                  )
                ) : (
                  <div>{renderRecordValue(normalizedProgressStats)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {leaderboardEntries.length > 0 ? (
          <div className="border border-gray-200 rounded-lg p-3 text-xs text-secondary-700 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-secondary-900">
                Monthly leaderboard
              </p>
              {leaderboardMeta && (
                <span className="text-[10px] uppercase tracking-wide text-secondary-500">
                  {pickFirstString(leaderboardMeta, ["period"]) || ""}
                </span>
              )}
            </div>
            <ol className="space-y-2 list-decimal list-inside">
              {leaderboardEntries.slice(0, 5).map((entry, index) => {
                const rank = coerceNumber(entry.rank) ?? index + 1;
                const userRecord = isRecord(entry.user) ? entry.user : {};
                const userName =
                  pickFirstString(userRecord, ["name", "full_name"]) ||
                  `Learner #${rank}`;
                const userEmail = pickFirstString(userRecord, ["email"]);
                const statsRecord = isRecord(entry.stats) ? entry.stats : {};
                const totalPoints =
                  findNumericValue(statsRecord, [
                    "total_points",
                    "points",
                    "score",
                  ]) ?? "–";
                const periodPoints =
                  findNumericValue(statsRecord, [
                    "period_points",
                    "monthly_points",
                  ]) ?? "–";
                return (
                  <li key={`leader-${rank}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-secondary-900">
                        #{rank} {userName}
                      </span>
                      <span className="text-primary-600 font-semibold">
                        {typeof totalPoints === "number"
                          ? `${totalPoints.toLocaleString()} pts`
                          : totalPoints}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-secondary-500">
                      {userEmail && <span>{userEmail}</span>}
                      {statsRecord && (
                        <span>
                          Period points:{" "}
                          {typeof periodPoints === "number"
                            ? periodPoints.toLocaleString()
                            : periodPoints}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {leaderboardEntries.length > 5 && (
              <p className="text-[10px] text-secondary-500">
                Showing top 5 of {leaderboardEntries.length} learners this
                period.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-secondary-500">
            No leaderboard insights yet. Earn points to climb the rankings.
          </p>
        )}
      </>
    </div>
  );

  const formatPrice = (mod: Module) => {
    const raw = mod.effective_price ?? mod.price;
    const numeric =
      typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;

    if (Number.isFinite(numeric) && numeric > 0) {
      return `$${numeric.toFixed(2)}`;
    }

    return "Free";
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-12 text-center animate-fade-in-down">
        <div className="relative">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 bg-clip-text text-transparent mb-4">
            Welcome back, {state.user?.firstName || "Learner"}!
          </h1>
          <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
            Explore the latest Albanian modules and continue your language
            journey.
          </p>
          <div className="flex justify-center">
            <div className="floating-element">
              <LottieIcon
                animationData={learningAnimation}
                className="w-20 h-20"
                loop={true}
                autoplay={true}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div
          className="stat-card group animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">
                Available Modules
              </p>
              <p className="text-4xl font-bold text-secondary-900 mb-2">
                {isLoading ? "–" : modules.length}
              </p>
              <div className="flex items-center text-sm text-primary-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v1H2V5z" />
                  <path
                    fillRule="evenodd"
                    d="M2 9h16v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9zm5 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Learn at your own pace</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="stat-card group animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">
                New Modules
              </p>
              <p className="text-4xl font-bold text-secondary-900 mb-2">
                {isLoading ? "–" : newModulesThisMonth}
              </p>
              <div className="flex items-center text-sm text-success-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 10a1 1 0 011-1h1V8a1 1 0 112 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0v-1H6a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Fresh content to explore</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="stat-card group animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">
                Your Role
              </p>
              <p className="text-4xl font-bold text-secondary-900 mb-2 capitalize">
                {state.user?.role || "learner"}
              </p>
              <div className="flex items-center text-sm text-secondary-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a2 2 0 00-2 2v1H7a3 3 0 00-3 3v1.586l-.707.707A1 1 0 003 12h14a1 1 0 00.707-1.707L17 9.586V8a3 3 0 00-3-3h-1V4a2 2 0 00-2-2z" />
                  <path d="M5 13a3 3 0 003 3h4a3 3 0 003-3H5z" />
                </svg>
                <span className="font-medium">
                  Access personalized learning paths
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="stat-card group animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-secondary-600 uppercase tracking-wide">
                Learning Points
              </p>
              <p className="text-4xl font-bold text-secondary-900 mb-2">
                {totalPointsEarned != null ? totalPointsEarned : "–"}
              </p>
              <div className="flex items-center text-sm text-primary-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.185 2.009a1 1 0 00-1.37 0L2.664 7.68a1 1 0 00.685 1.72H4v6.6A2 2 0 006 18h8a2 2 0 002-2v-6.6h1.651a1 1 0 00.685-1.72l-6.152-5.67z" />
                </svg>
                <span className="font-medium">Keep stacking achievements</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-secondary-900">
            Recommended Modules
          </h2>
          <button
            onClick={fetchModules}
            className="btn-secondary text-sm"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-secondary-500">
            Fetching the latest modules...
          </div>
        ) : error ? (
          <div className="py-10 text-center text-error-600">{error}</div>
        ) : modules.length === 0 ? (
          <div className="py-10 text-center text-secondary-500">
            No published modules are available yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => (
              <Link
                to={`/modules/${module.slug}`}
                key={module.id}
                className="group block p-5 border border-gray-200 rounded-2xl hover:border-primary-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-secondary-900 group-hover:text-primary-700">
                    {module.title}
                  </h3>
                  <span className="text-xs text-secondary-500">
                    {module.level || "All levels"}
                  </span>
                </div>
                <p className="text-sm text-secondary-600 mb-4 line-clamp-3">
                  {module.short_description ||
                    module.description ||
                    "No description provided."}
                </p>
                <div className="flex items-center justify-between text-sm text-secondary-500">
                  <span>
                    Duration: {module.duration_hours ?? "—"} hrs · Lessons:{" "}
                    {module.lessons_count ?? "—"}
                  </span>
                  <span className="font-medium text-primary-600">
                    {formatPrice(module)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isStudent && (
        <div className="card mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-secondary-900">
              All Modules
            </h2>
            <span className="text-sm text-secondary-500">
              {isLoading ? "Loading…" : `${sortedModules.length} total`}
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-secondary-500">
              Sorting your library…
            </div>
          ) : error ? (
            <div className="py-8 text-center text-error-600">{error}</div>
          ) : sortedModules.length === 0 ? (
            <div className="py-8 text-center text-secondary-500">
              No modules available yet. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedModules.map((module) => (
                <Link
                  to={`/modules/${module.slug}`}
                  key={`all-mod-${module.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-gray-200 p-5 transition hover:border-primary-200 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-secondary-900 group-hover:text-primary-700">
                      {module.title}
                    </h3>
                    <span className="text-xs text-secondary-500">
                      {module.level || "All levels"}
                    </span>
                  </div>
                  <p className="mb-4 flex-1 text-sm text-secondary-600 line-clamp-3">
                    {module.short_description ||
                      module.description ||
                      "No description provided."}
                  </p>
                  <div className="flex flex-wrap items-center justify-between text-xs text-secondary-500">
                    <span>
                      Released:{" "}
                      {(() => {
                        const timestamp =
                          module.published_at ?? module.created_at;
                        if (!timestamp) return "—";
                        const date = new Date(timestamp);
                        return Number.isNaN(date.getTime())
                          ? "—"
                          : date.toLocaleDateString();
                      })()}
                    </span>
                    <span className="text-sm font-medium text-primary-600">
                      {formatPrice(module)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <AchievementsPanel />
        <ProgressPanel />
      </div>

      <div className="card mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-secondary-900">
            Your learning path
          </h2>
          <span className="text-sm text-secondary-500">
            {learningPath.length} recommended steps
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-secondary-800 mb-2">
              Accessible modules
            </h3>
            {accessibleModules.length === 0 ? (
              <p className="text-xs text-secondary-500">
                Unlock more modules by completing prerequisites.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-secondary-700">
                {accessibleModules.slice(0, 5).map((mod) => (
                  <li
                    key={mod.id}
                    className="flex items-center justify-between"
                  >
                    <Link
                      to={`/modules/${mod.slug}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {mod.title}
                    </Link>
                    <span className="text-xs text-secondary-500 capitalize">
                      {mod.level || "All"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-secondary-800 mb-2">
              Locked modules
            </h3>
            {lockedModules.length === 0 ? (
              <p className="text-xs text-secondary-500">
                Great! You have access to all modules in your path.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-secondary-700">
                {lockedModules.slice(0, 5).map((mod) => (
                  <li
                    key={mod.id}
                    className="flex items-center justify-between opacity-70"
                  >
                    <span>{mod.title}</span>
                    <span className="text-xs text-secondary-500 capitalize">
                      {mod.level || "All"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {learningPath.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-secondary-800 mb-2">
              Suggested order
            </p>
            <ol className="list-decimal list-inside text-sm text-secondary-600 space-y-1">
              {learningPath.slice(0, 6).map((mod) => (
                <li key={mod.id}>
                  <Link
                    to={`/modules/${mod.slug}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {mod.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-secondary-900 mb-4">
          Recently Added Modules
        </h2>
        {recentModules.length === 0 ? (
          <p className="text-sm text-secondary-500">No recent modules yet.</p>
        ) : (
          <div className="space-y-4">
            {recentModules.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
              >
                <div>
                  <p className="font-medium text-secondary-900">
                    {module.title}
                  </p>
                  <p className="text-xs text-secondary-500">
                    Published{" "}
                    {new Date(
                      module.published_at || module.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary-600">
                  {module.level || "All"} · {module.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
