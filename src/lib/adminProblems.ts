export type ProblemDifficulty = "beginner" | "easy" | "medium" | "hard";

export type AdminProblemStatus = "public" | "private" | "draft" | "archived";

const maxPublicTestCases = 3;
const maxHiddenTestCases = 10;
const maxAdminTestCases = maxPublicTestCases + maxHiddenTestCases;

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
  testCases: AdminProblemTestCaseInput[];
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProblemTestCaseInput = {
  name: string;
  input: string;
  output: string;
  isSample: boolean;
  score: number;
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
  testCases: AdminProblemTestCaseInput[];
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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
    return response.status === 404
      ? "admin問題APIがまだ反映されていません。backend_apiを再ビルド/再起動してください。"
      : response.statusText;
  }

  if (response.status === 404 && text.includes("404 page not found")) {
    return "admin問題APIがまだ反映されていません。backend_apiを再ビルド/再起動してください。";
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const source = objectValue(payload);
    return cleanErrorMessage(stringValue(source.error ?? source.message, text));
  } catch {
    return cleanErrorMessage(text);
  }
}

function cleanErrorMessage(message: string) {
  const trimmed = message.trim();
  if (trimmed === "invalid input") {
    return "入力内容に不備があります。未完了の項目を確認してください。";
  }
  if (trimmed.startsWith("invalid input: ")) {
    return trimmed.slice("invalid input: ".length);
  }
  return trimmed;
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
  const testCases = normalizeAdminTestCases(
    source.test_cases ?? source.testCases ?? problem.test_cases ?? problem.testCases
  );
  const sampleCount = numberValue(
    problem.sample_case_count ?? problem.sampleCaseCount,
    testCases.filter((testCase) => testCase.isSample).length || samples.length
  );
  const testCaseCount = numberValue(
    problem.test_case_count ?? problem.testCaseCount,
    testCases.length || samples.length
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
    testCases,
    createdAt: optionalString(problem.created_at ?? problem.createdAt),
    updatedAt: optionalString(problem.updated_at ?? problem.updatedAt),
  };
}

function adminProblemPayload(input: AdminProblemInput) {
  const memoryLimitKb = Math.max(1, Math.round(input.memoryLimitMb * 1000));
  const testCases = input.testCases.filter((testCase) => testCase.output.trim() !== "");
  let nextPublicIndex = 0;
  let nextHiddenIndex = 0;

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
    test_cases: testCases.map((testCase) => {
      const nextIndex = testCase.isSample ? nextPublicIndex++ : nextHiddenIndex++;
      return {
        name: testCase.name.trim() || defaultTestCaseName(nextIndex, testCase.isSample),
        input: testCase.input,
        output: testCase.output,
        is_sample: testCase.isSample,
        score: testCase.isSample ? 0 : Math.max(0, Math.round(testCase.score)),
      };
    }),
  };
}

function defaultTestCaseName(index: number, isSample: boolean) {
  const number = String(index + 1).padStart(2, "0");
  return isSample ? `sample_${number}` : `hidden_${number}`;
}

function normalizeSamples(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => objectValue(item))
        .filter((item) => Boolean(item.input ?? item.stdin ?? item.output ?? item.stdout))
    : [];
}

function normalizeAdminTestCases(value: unknown): AdminProblemTestCaseInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  let nextPublicIndex = 0;
  let nextHiddenIndex = 0;
  return value.slice(0, maxAdminTestCases).map((item, index) => {
    const source = objectValue(item);
    const isHidden = booleanValue(source.is_hidden ?? source.isHidden, index !== 0);
    const isSample = booleanValue(source.is_sample ?? source.isSample, !isHidden);
    const nextIndex = isSample ? nextPublicIndex++ : nextHiddenIndex++;
    return {
      name: stringValue(source.name, defaultTestCaseName(nextIndex, isSample)),
      input: stringValue(source.input ?? source.stdin, ""),
      output: stringValue(source.output ?? source.stdout, ""),
      isSample,
      score: numberValue(source.score, isSample ? 0 : 100),
    };
  });
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

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function difficultyValue(value: unknown): ProblemDifficulty {
  return value === "beginner" || value === "easy" || value === "medium" || value === "hard"
    ? value
    : "easy";
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
