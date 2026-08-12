import { ARTIFACTS, STATUSES, TASK_TYPES } from "../src/constants.js";

const ANALYSIS_FIELDS = [
  "summary",
  "feedback",
  "next",
  "project",
  "task_types",
  "artifacts",
  "status",
  "keywords",
  "decisions",
  "execution_summary",
];

export function validate(analysisObj) {
  const errors = [];

  if (!analysisObj || typeof analysisObj !== "object" || Array.isArray(analysisObj)) {
    return { ok: false, errors: ["analysis는 객체여야 합니다."] };
  }

  const extraFields = Object.keys(analysisObj).filter((field) => !ANALYSIS_FIELDS.includes(field));
  if (extraFields.length > 0) {
    errors.push(`허용되지 않은 필드: ${extraFields.join(", ")}`);
  }

  const summary = normalizeRequiredString(analysisObj.summary, "summary", 300, errors);
  const feedback = normalizeRequiredString(analysisObj.feedback, "feedback", 300, errors);
  const next = normalizeRequiredString(analysisObj.next, "next", 300, errors);
  const project = normalizeRequiredString(analysisObj.project, "project", 100, errors);
  const taskTypes = normalizeStringArray(analysisObj.task_types, "task_types", errors, {
    minimum: 1,
    maximum: 3,
    allowedValues: TASK_TYPES,
    lowercase: true,
    unique: true,
  });
  const artifacts = normalizeStringArray(analysisObj.artifacts, "artifacts", errors, {
    minimum: 1,
    maximum: 3,
    allowedValues: ARTIFACTS,
    lowercase: true,
  });
  const status = normalizeEnum(analysisObj.status, "status", STATUSES, errors);
  const keywords = normalizeStringArray(analysisObj.keywords, "keywords", errors, {
    minimum: 3,
    maximum: 8,
    maximumItemLength: 40,
    requireNonEmpty: true,
  });
  const decisions = normalizeStringArray(analysisObj.decisions, "decisions", errors, {
    minimum: 0,
    maximum: 6,
    maximumItemLength: 200,
  });
  const executionSummary = normalizeRequiredString(
    analysisObj.execution_summary,
    "execution_summary",
    2000,
    errors,
  );

  if (artifacts.includes("none") && artifacts.length !== 1) {
    errors.push('artifacts에 "none"이 있으면 그것 하나만 있어야 합니다.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      summary,
      feedback,
      next,
      project,
      task_types: taskTypes,
      artifacts,
      status,
      keywords,
      decisions,
      execution_summary: executionSummary,
    },
  };
}

function normalizeRequiredString(value, field, maximumLength, errors) {
  if (typeof value !== "string") {
    errors.push(`${field}는 문자열이어야 합니다.`);
    return "";
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    errors.push(`${field}는 비어 있을 수 없습니다.`);
  }
  if (normalized.length > maximumLength) {
    errors.push(`${field}는 ${maximumLength}자 이하여야 합니다.`);
  }
  return normalized;
}

function normalizeEnum(value, field, allowedValues, errors) {
  if (typeof value !== "string") {
    errors.push(`${field}는 문자열이어야 합니다.`);
    return "";
  }

  const normalized = value.trim().toLowerCase();
  if (!allowedValues.includes(normalized)) {
    errors.push(`${field}에 허용되지 않은 값이 있습니다.`);
  }
  return normalized;
}

function normalizeStringArray(value, field, errors, options) {
  if (!Array.isArray(value)) {
    errors.push(`${field}는 배열이어야 합니다.`);
    return [];
  }

  if (value.length < options.minimum || value.length > options.maximum) {
    errors.push(`${field}의 항목 수는 ${options.minimum}~${options.maximum}개여야 합니다.`);
  }

  const normalizedValues = value.map((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${field}[${index}]는 문자열이어야 합니다.`);
      return "";
    }

    const trimmed = item.trim();
    const normalized = options.lowercase ? trimmed.toLowerCase() : trimmed;

    if (options.requireNonEmpty && normalized.length === 0) {
      errors.push(`${field}[${index}]는 비어 있을 수 없습니다.`);
    }
    if (options.maximumItemLength && normalized.length > options.maximumItemLength) {
      errors.push(`${field}[${index}]는 ${options.maximumItemLength}자 이하여야 합니다.`);
    }
    if (options.allowedValues && !options.allowedValues.includes(normalized)) {
      errors.push(`${field}[${index}]에 허용되지 않은 값이 있습니다.`);
    }

    return normalized;
  });

  if (options.unique && new Set(normalizedValues).size !== normalizedValues.length) {
    errors.push(`${field}에는 중복 값이 있을 수 없습니다.`);
  }

  return normalizedValues;
}
