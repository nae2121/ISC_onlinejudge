export type UserRole = "user" | "admin" | "problem_setter" | "judge_admin";

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  rating: number;
  solvedCount: number;
  submissionsCount: number;
};

export type Problem = {
  slug: string;
  title: string;
  difficulty: "beginner" | "easy" | "medium" | "hard";
  score: number;
  tags: string[];
  acceptedCount: number;
  submissionCount: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  statement: string;
};

export type SubmissionStatus = "AC" | "WA" | "TLE" | "RE" | "CE" | "WJ";

export type Submission = {
  id: number;
  problemSlug: string;
  problemTitle: string;
  language: string;
  status: SubmissionStatus;
  score: number;
  submittedAt: string;
};

export type LoginInput = {
  identity: string;
  password: string;
};

export type RegisterInput = {
  username: string;
  displayName: string;
  email: string;
  password: string;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function login(input: LoginInput) {
  const user = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeUser(user);
}

export async function register(input: RegisterInput) {
  const user = await apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeUser(user);
}

export async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return;
    }
    throw error;
  }
}

export async function getMe() {
  try {
    const user = await apiRequest<unknown>("/api/auth/me");
    return normalizeUser(user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function getProblems() {
  const problems = await apiRequest<unknown[]>("/api/problems");
  return problems.map(normalizeProblem);
}

export async function getProblem(slug: string) {
  try {
    const payload = await apiRequest<unknown>(`/api/problems/${encodeURIComponent(slug)}`);
    return normalizeProblem(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getProfile() {
  try {
    const user = await apiRequest<unknown>("/api/me/profile");
    return normalizeUser(user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function getMySubmissions() {
  const submissions = await apiRequest<unknown[]>("/api/me/submissions");
  return submissions.map(normalizeSubmission);
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await errorMessage(response);
    throw new ApiError(response.status, message || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function errorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) {
    return response.statusText;
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const source = objectValue(payload);
    return stringValue(source.error ?? source.message, text);
  } catch {
    return text;
  }
}

function normalizeUser(value: unknown): CurrentUser {
  const source = unwrapUser(value);
  return {
    id: numberValue(source.id, 0),
    username: stringValue(source.username, ""),
    displayName: stringValue(source.display_name ?? source.displayName, ""),
    email: stringValue(source.email, ""),
    role: roleValue(source.role),
    rating: numberValue(source.rating, 0),
    solvedCount: numberValue(source.solved_count ?? source.solvedCount, 0),
    submissionsCount: numberValue(source.submissions_count ?? source.submissionsCount, 0),
  };
}

function normalizeProblem(value: unknown): Problem {
  const source = objectValue(value);
  const wrappedProblem = objectValue(source.problem);
  const problem = Object.keys(wrappedProblem).length > 0 ? wrappedProblem : source;

  return {
    slug: stringValue(problem.slug, "unknown"),
    title: stringValue(problem.title, "Untitled Problem"),
    difficulty: difficultyValue(problem.difficulty),
    score: numberValue(problem.score, 100),
    tags: arrayOfStrings(problem.tags),
    acceptedCount: numberValue(problem.accepted_count ?? problem.acceptedCount, 0),
    submissionCount: numberValue(problem.submission_count ?? problem.submissionCount, 0),
    timeLimitMs: numberValue(problem.time_limit_ms ?? problem.timeLimitMs, 2000),
    memoryLimitMb: memoryLimitValue(problem),
    statement: stringValue(
      problem.statement ?? problem.statement_markdown ?? problem.statementMarkdown,
      ""
    ),
  };
}

function normalizeSubmission(value: unknown): Submission {
  const source = objectValue(value);
  const problemID = numberValue(source.problem_id ?? source.problemId, 0);
  const languageID = numberValue(source.language_id ?? source.languageId, 0);

  return {
    id: numberValue(source.id, 0),
    problemSlug: stringValue(source.problem_slug ?? source.problemSlug, String(problemID)),
    problemTitle: stringValue(
      source.problem_title ?? source.problemTitle,
      problemID ? `Problem #${problemID}` : "Untitled Problem"
    ),
    language: stringValue(source.language, languageID ? `Language #${languageID}` : "Unknown"),
    status: statusValue(source.status),
    score: numberValue(source.score, 0),
    submittedAt: stringValue(source.submitted_at ?? source.submittedAt, new Date().toISOString()),
  };
}

function memoryLimitValue(source: Record<string, unknown>) {
  if (typeof source.memory_limit_mb === "number") {
    return source.memory_limit_mb;
  }
  if (typeof source.memoryLimitMb === "number") {
    return source.memoryLimitMb;
  }
  if (typeof source.memory_limit_kb === "number") {
    return Math.max(1, Math.round(source.memory_limit_kb / 1000));
  }
  return 256;
}

function unwrapUser(value: unknown) {
  const source = objectValue(value);
  return objectValue(source.user ?? source);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function roleValue(value: unknown): UserRole {
  return value === "admin" ||
    value === "problem_setter" ||
    value === "judge_admin" ||
    value === "user"
    ? value
    : "user";
}

function difficultyValue(value: unknown): Problem["difficulty"] {
  return value === "beginner" || value === "easy" || value === "medium" || value === "hard"
    ? value
    : "easy";
}

function statusValue(value: unknown): SubmissionStatus {
  return value === "AC" ||
    value === "WA" ||
    value === "TLE" ||
    value === "RE" ||
    value === "CE" ||
    value === "WJ"
    ? value
    : "WJ";
}
