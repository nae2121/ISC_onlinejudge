export type UserRole = "user" | "admin" | "problem_setter" | "judge_admin";

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: AdminUserStatus;
  isActive: boolean;
  rating: number;
  solvedCount: number;
  points: number;
  submissionsCount: number;
};

export type AdminUserStatus = "pending" | "active" | "suspended";

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: AdminUserStatus;
  isActive: boolean;
  approvedAt?: string;
  approvedBy?: number;
  pinVerifiedAt?: string;
  createdAt?: string;
};

export function isAdminUser(user: Pick<CurrentUser, "role"> | null | undefined) {
  return user?.role === "admin";
}

export function isApprovedUser(
  user: Pick<CurrentUser, "isActive" | "role" | "status"> | null | undefined
) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.status === "active" && user.isActive;
}

export type Problem = {
  id: number;
  slug: string;
  title: string;
  difficulty: "beginner" | "easy" | "medium" | "hard";
  score: number;
  tags: string[];
  solved: boolean;
  acceptedCount: number;
  submissionCount: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  statement: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  samples: ProblemSample[];
};

export type ProblemSample = {
  id?: number;
  name: string;
  input: string;
  output: string;
  explanation?: string;
};

export type ProblemDifficulty = Problem["difficulty"];

export type AdminProblemStatus = "public" | "private" | "draft" | "archived";

export type AdminProblem = {
  id: number;
  title: string;
  slug: string;
  problemCode: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  score: number;
  difficulty: ProblemDifficulty;
  tags: string[];
  isPublic: boolean;
  status: AdminProblemStatus;
  testCaseCount: number;
  sampleCaseCount: number;
  hiddenCaseCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProblemInput = {
  title: string;
  slug: string;
  problemCode: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  score: number;
  difficulty: ProblemDifficulty;
  tags: string[];
  isPublic: boolean;
};

export type SubmissionStatus = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OLE" | "IE" | "WJ";

export type Submission = {
  id: number;
  problemId: number;
  problemSlug: string;
  problemTitle: string;
  language: string;
  languageId: number;
  status: SubmissionStatus;
  score: number;
  maxTimeMs: number;
  maxMemoryKb: number;
  submittedAt: string;
  errorMessage?: string;
};

export type CreateSubmissionInput = {
  languageId: number;
  problemId?: number;
  problemSlug?: string;
  sourceCode: string;
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
  pinCode: string;
};

const API_REQUEST_TIMEOUT_MS = 15_000;

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
    body: JSON.stringify({
      username: input.username,
      display_name: input.displayName,
      email: input.email,
      password: input.password,
      pin_code: input.pinCode,
    }),
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

export async function getSolvedProblems(username: string) {
  const problems = await apiRequest<unknown[]>(
    `/api/users/${encodeURIComponent(username)}/solved`
  );
  return problems.map(normalizeProblem);
}

export async function submitProblem(input: CreateSubmissionInput) {
  const submission = await apiRequest<unknown>("/api/submissions", {
    method: "POST",
    body: JSON.stringify({
      language_id: input.languageId,
      problem_id: input.problemId,
      problem_slug: input.problemSlug,
      source_code: input.sourceCode,
    }),
  });
  return normalizeSubmission(submission);
}

export async function getSubmission(id: number) {
  const submission = await apiRequest<unknown>(`/api/submissions/${encodeURIComponent(String(id))}`);
  return normalizeSubmission(submission);
}

export async function getAdminUsers() {
  const payload = await apiRequest<unknown>("/api/admin/users");
  const source = objectValue(payload);
  const users = Array.isArray(payload)
    ? payload
    : Array.isArray(source.users)
      ? source.users
      : [];
  return users.map(normalizeAdminUser);
}

export async function approveAdminUser(id: number) {
  return updateAdminUserActive(id, true);
}

export async function updateAdminUserActive(id: number, isActive: boolean) {
  const user = await apiRequest<unknown>(`/api/admin/users/${encodeURIComponent(String(id))}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
  return normalizeAdminUser(user);
}

export async function changeAdminUserPassword(id: number, password: string) {
  return apiRequest<{ message?: string }>(
    `/api/admin/users/${encodeURIComponent(String(id))}/password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );
}

export async function getAdminProblems() {
  const payload = await apiRequest<unknown>("/api/admin/problems");
  const source = objectValue(payload);
  const problems = Array.isArray(payload)
    ? payload
    : Array.isArray(source.problems)
      ? source.problems
      : [];
  return problems.map(normalizeAdminProblem);
}

export async function getAdminProblem(id: number) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}`
  );
  return normalizeAdminProblem(payload);
}

export async function createAdminProblem(input: AdminProblemInput) {
  const payload = await apiRequest<unknown>("/api/admin/problems", {
    method: "POST",
    body: JSON.stringify(adminProblemPayload(input)),
  });
  return normalizeAdminProblem(payload);
}

export async function updateAdminProblem(id: number, input: AdminProblemInput) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(adminProblemPayload(input)),
    }
  );
  return normalizeAdminProblem(payload);
}

export async function publishAdminProblem(id: number) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}/publish`,
    { method: "POST" }
  );
  return normalizeAdminProblem(payload);
}

export async function unpublishAdminProblem(id: number) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}/unpublish`,
    { method: "POST" }
  );
  return normalizeAdminProblem(payload);
}

export async function archiveAdminProblem(id: number) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}/archive`,
    { method: "POST" }
  );
  return normalizeAdminProblem(payload);
}

export async function copyAdminProblem(id: number) {
  const payload = await apiRequest<unknown>(
    `/api/admin/problems/${encodeURIComponent(String(id))}/copy`,
    { method: "POST" }
  );
  return normalizeAdminProblem(payload);
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "通信がタイムアウトしました"
        : error instanceof Error
          ? error.message
          : String(error);
    throw new ApiError(0, message);
  } finally {
    clearTimeout(timeoutID);
  }

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
  const role = roleValue(source.role);
  const isActive = role === "admin"
    ? true
    : booleanValue(source.is_active ?? source.isActive, true);
  return {
    id: numberValue(source.id, 0),
    username: stringValue(source.username, ""),
    displayName: stringValue(source.display_name ?? source.displayName, ""),
    email: stringValue(source.email, ""),
    role,
    status: role === "admin"
      ? "active"
      : adminUserStatusValue(source.status, isActive ? "active" : "pending"),
    isActive,
    rating: numberValue(source.rating, 0),
    solvedCount: numberValue(source.solved_count ?? source.solvedCount, 0),
    points: numberValue(source.points ?? source.earned_points ?? source.earnedPoints, 0),
    submissionsCount: numberValue(source.submissions_count ?? source.submissionsCount, 0),
  };
}

function normalizeProblem(value: unknown): Problem {
  const source = objectValue(value);
  const wrappedProblem = objectValue(source.problem);
  const problem = Object.keys(wrappedProblem).length > 0 ? wrappedProblem : source;

  return {
    id: numberValue(problem.id, 0),
    slug: stringValue(problem.slug, "unknown"),
    title: stringValue(problem.title, "Untitled Problem"),
    difficulty: difficultyValue(problem.difficulty),
    score: numberValue(problem.score, 100),
    tags: arrayOfStrings(problem.tags),
    solved: booleanValue(problem.solved ?? problem.is_solved ?? problem.accepted, false),
    acceptedCount: numberValue(problem.accepted_count ?? problem.acceptedCount, 0),
    submissionCount: numberValue(problem.submission_count ?? problem.submissionCount, 0),
    timeLimitMs: numberValue(problem.time_limit_ms ?? problem.timeLimitMs, 2000),
    memoryLimitMb: memoryLimitValue(problem),
    statement: stringValue(
      problem.statement ?? problem.statement_markdown ?? problem.statementMarkdown,
      ""
    ),
    constraints: optionalString(problem.constraints),
    inputFormat: optionalString(problem.input_format ?? problem.inputFormat),
    outputFormat: optionalString(problem.output_format ?? problem.outputFormat),
    samples: normalizeSamples(source.test_cases ?? source.testCases ?? problem.samples),
  };
}

function normalizeSubmission(value: unknown): Submission {
  const source = objectValue(value);
  const problemID = numberValue(source.problem_id ?? source.problemId, 0);
  const languageID = numberValue(source.language_id ?? source.languageId, 0);
  const results = Array.isArray(source.results) ? source.results.map(objectValue) : [];
  const resultError = results
    .map((result) => result.error_message ?? result.errorMessage)
    .find((message) => typeof message === "string" && message.trim());

  return {
    id: numberValue(source.id, 0),
    problemId: problemID,
    problemSlug: stringValue(source.problem_slug ?? source.problemSlug, String(problemID)),
    problemTitle: stringValue(
      source.problem_title ?? source.problemTitle,
      problemID ? `Problem #${problemID}` : "Untitled Problem"
    ),
    language: stringValue(source.language, languageID ? `Language #${languageID}` : "Unknown"),
    languageId: languageID,
    status: statusValue(source.status),
    score: numberValue(source.score, 0),
    maxTimeMs: numberValue(source.max_time_ms ?? source.maxTimeMs, 0),
    maxMemoryKb: numberValue(source.max_memory_kb ?? source.maxMemoryKb, 0),
    submittedAt: stringValue(source.submitted_at ?? source.submittedAt, new Date().toISOString()),
    errorMessage: optionalString(source.error_message ?? source.errorMessage ?? resultError),
  };
}

function normalizeAdminUser(value: unknown): AdminUser {
  const source = objectValue(value);
  const user = objectValue(source.user);
  const target = Object.keys(user).length > 0 ? user : source;
  const role = roleValue(target.role);
  const isActive = role === "admin"
    ? true
    : booleanValue(target.is_active ?? target.isActive, false);

  return {
    id: numberValue(target.id, 0),
    username: stringValue(target.username, ""),
    displayName: stringValue(target.display_name ?? target.displayName, ""),
    email: stringValue(target.email, ""),
    role,
    status: role === "admin"
      ? "active"
      : adminUserStatusValue(target.status, isActive ? "active" : "pending"),
    isActive,
    approvedAt: optionalString(target.approved_at ?? target.approvedAt),
    approvedBy: optionalNumber(target.approved_by ?? target.approvedBy),
    pinVerifiedAt: optionalString(target.pin_verified_at ?? target.pinVerifiedAt),
    createdAt: optionalString(target.created_at ?? target.createdAt),
  };
}

function normalizeAdminProblem(value: unknown): AdminProblem {
  const source = objectValue(value);
  const wrappedProblem = objectValue(source.problem);
  const problem = Object.keys(wrappedProblem).length > 0 ? wrappedProblem : source;
  const isArchived = booleanValue(problem.is_archived ?? problem.isArchived, false);
  const isDraft = booleanValue(problem.is_draft ?? problem.isDraft, false);
  const isPublic = booleanValue(problem.is_public ?? problem.isPublic, false);
  const status = adminProblemStatusValue(
    problem.status,
    isArchived ? "archived" : isDraft ? "draft" : isPublic ? "public" : "private"
  );
  const samples = normalizeSamples(source.test_cases ?? source.testCases ?? problem.samples);
  const sampleCount = numberValue(
    problem.sample_case_count ?? problem.sampleCaseCount,
    samples.length
  );
  const testCaseCount = numberValue(
    problem.test_case_count ?? problem.testCaseCount,
    samples.length
  );

  return {
    id: numberValue(problem.id, 0),
    title: stringValue(problem.title, ""),
    slug: stringValue(problem.slug, ""),
    problemCode: stringValue(
      problem.problem_code ?? problem.problemCode ?? problem.code,
      ""
    ),
    statement: stringValue(
      problem.statement ?? problem.statement_markdown ?? problem.statementMarkdown,
      ""
    ),
    constraints: stringValue(problem.constraints, ""),
    inputFormat: stringValue(problem.input_format ?? problem.inputFormat, ""),
    outputFormat: stringValue(problem.output_format ?? problem.outputFormat, ""),
    timeLimitMs: numberValue(problem.time_limit_ms ?? problem.timeLimitMs, 2000),
    memoryLimitMb: memoryLimitValue(problem),
    score: numberValue(problem.score, 100),
    difficulty: difficultyValue(problem.difficulty),
    tags: arrayOfStrings(problem.tags),
    isPublic: status === "public",
    status,
    testCaseCount,
    sampleCaseCount: sampleCount,
    hiddenCaseCount: numberValue(
      problem.hidden_case_count ?? problem.hiddenCaseCount,
      Math.max(0, testCaseCount - sampleCount)
    ),
    createdAt: optionalString(problem.created_at ?? problem.createdAt),
    updatedAt: optionalString(problem.updated_at ?? problem.updatedAt),
  };
}

function adminProblemPayload(input: AdminProblemInput) {
  const memoryLimitKb = Math.max(1, Math.round(input.memoryLimitMb * 1000));

  return {
    title: input.title,
    slug: input.slug,
    problem_code: input.problemCode,
    statement_markdown: input.statement,
    constraints: input.constraints,
    input_format: input.inputFormat,
    output_format: input.outputFormat,
    time_limit_ms: input.timeLimitMs,
    memory_limit_mb: input.memoryLimitMb,
    memory_limit_kb: memoryLimitKb,
    score: input.score,
    difficulty: input.difficulty,
    tags: input.tags,
    is_public: input.isPublic,
  };
}

function normalizeSamples(value: unknown): ProblemSample[] {
  return Array.isArray(value)
    ? value
        .map((item, index): ProblemSample | null => {
          const source = objectValue(item);
          const input = stringValue(source.input ?? source.stdin, "");
          const output = stringValue(source.output ?? source.stdout, "");
          if (!input && !output) {
            return null;
          }
          return {
            id: numberValue(source.id, index + 1),
            name: stringValue(source.name, `サンプル${index + 1}`),
            input,
            output,
            explanation: optionalString(source.explanation),
          };
        })
        .filter((sample): sample is ProblemSample => sample !== null)
    : [];
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

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
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
    value === "MLE" ||
    value === "RE" ||
    value === "CE" ||
    value === "OLE" ||
    value === "IE" ||
    value === "WJ"
    ? value
    : "WJ";
}

function adminUserStatusValue(
  value: unknown,
  fallback: AdminUserStatus = "pending"
): AdminUserStatus {
  return value === "pending" || value === "active" || value === "suspended"
    ? value
    : fallback;
}

function adminProblemStatusValue(
  value: unknown,
  fallback: AdminProblemStatus
): AdminProblemStatus {
  return value === "public" ||
    value === "private" ||
    value === "draft" ||
    value === "archived"
    ? value
    : fallback;
}
