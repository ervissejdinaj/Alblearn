import { LessonStep } from "../types";

const LESSON_SCHEMA_VERSION = 1;

export interface LessonContentSchema {
  version: number;
  steps: LessonStep[];
}

const createStepId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `step-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export const normalizeLessonStep = (step: Partial<LessonStep>): LessonStep => ({
  id: step.id || createStepId(),
  title: step.title?.trim() || "Lesson step",
  content: step.content || "",
  type: (step.type as LessonStep["type"]) || "instruction",
  mediaUrl: step.mediaUrl,
});

export const parseLessonSteps = (
  rawContent: unknown
): LessonStep[] => {
  if (!rawContent) {
    return [];
  }
  if (Array.isArray(rawContent)) {
    return (rawContent as LessonStep[]).map(normalizeLessonStep);
  }

  if (typeof rawContent === "string") {
    try {
      const parsed = JSON.parse(rawContent) as LessonContentSchema | LessonStep[];
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeLessonStep);
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        "steps" in parsed &&
        Array.isArray(parsed.steps)
      ) {
        return parsed.steps.map(normalizeLessonStep);
      }
    } catch (error) {
      return [
        normalizeLessonStep({
          title: "Lesson content",
          content: rawContent,
          type: "instruction",
        }),
      ];
    }
  }

  if (typeof rawContent === "object" && rawContent) {
    const maybeSteps = (rawContent as { steps?: LessonStep[] }).steps;
    if (Array.isArray(maybeSteps)) {
      return maybeSteps.map(normalizeLessonStep);
    }
  }

  return [
    normalizeLessonStep({
      title: "Lesson content",
      content: String(rawContent),
      type: "instruction",
    }),
  ];
};

export const serializeLessonSteps = (steps: LessonStep[]): string => {
  const payload: LessonContentSchema = {
    version: LESSON_SCHEMA_VERSION,
    steps: steps.map(normalizeLessonStep),
  };
  return JSON.stringify(payload);
};

export const createEmptyLessonStep = (): LessonStep => ({
  id: createStepId(),
  title: "New lesson step",
  content: "",
  type: "instruction",
});

export const resolveLessonSteps = (
  lessonSteps: LessonStep[] | null | undefined,
  content: string | null | undefined
): LessonStep[] => {
  if (Array.isArray(lessonSteps) && lessonSteps.length > 0) {
    return lessonSteps.map(normalizeLessonStep);
  }
  return parseLessonSteps(content ?? null);
};
