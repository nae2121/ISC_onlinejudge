"use client";

import { Eye, Plus, Save, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type {
  AdminProblem,
  AdminProblemInput,
  AdminProblemTestCaseInput,
  ProblemDifficulty,
} from "@/lib/adminProblems";

type AdminProblemFormProps = {
  initialProblem?: AdminProblem;
  mode: "create" | "edit";
  onSubmit: (input: AdminProblemInput) => Promise<void>;
  saving: boolean;
};

const difficulties: ProblemDifficulty[] = ["beginner", "easy", "medium", "hard"];
const maxPublicTestCases = 3;
const maxHiddenTestCases = 10;

const emptyProblem: AdminProblemInput = {
  constraints: "",
  difficulty: "easy",
  inputFormat: "",
  isPublic: false,
  memoryLimitMb: 256,
  outputFormat: "",
  problemCode: "",
  score: 100,
  slug: "",
  statement: "",
  tags: [],
  testCases: [],
  timeLimitMs: 2000,
  title: "",
};

export function AdminProblemForm({
  initialProblem,
  mode,
  onSubmit,
  saving,
}: AdminProblemFormProps) {
  const [form, setForm] = useState<AdminProblemInput>(() =>
    initialProblem ? adminProblemToInput(initialProblem) : emptyProblem
  );
  const [preview, setPreview] = useState(false);
  const [tagsInput, setTagsInput] = useState(() => initialProblem?.tags.join(", ") ?? "");
  const [autoSlug, setAutoSlug] = useState(mode === "create");
  const [autoProblemCode, setAutoProblemCode] = useState(mode === "create");
  const [showValidation, setShowValidation] = useState(false);

  const validationIssues = useMemo(
    () => getValidationIssues(form, mode),
    [form, mode]
  );
  const indexedTestCases = form.testCases.map((testCase, index) => ({ index, testCase }));
  const publicTestCases = indexedTestCases.filter(({ testCase }) => testCase.isSample);
  const hiddenTestCases = indexedTestCases.filter(({ testCase }) => !testCase.isSample);

  function update<K extends keyof AdminProblemInput>(key: K, value: AdminProblemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: autoSlug ? slugFromTitle(value) : current.slug,
      problemCode: autoProblemCode ? problemCodeFromTitle(value) : current.problemCode,
    }));
  }

  function applySlugFromTitle() {
    setAutoSlug(true);
    setForm((current) => ({ ...current, slug: slugFromTitle(current.title) }));
  }

  function applyProblemCodeFromTitle() {
    setAutoProblemCode(true);
    setForm((current) => ({
      ...current,
      problemCode: problemCodeFromTitle(current.title || current.slug),
    }));
  }

  function addTestCase(isSample: boolean) {
    setForm((current) => {
      const currentCount = current.testCases.filter(
        (testCase) => testCase.isSample === isSample
      ).length;
      const maxCount = isSample ? maxPublicTestCases : maxHiddenTestCases;
      if (currentCount >= maxCount) {
        return current;
      }
      return {
        ...current,
        testCases: [
          ...current.testCases,
          {
            name: defaultTestCaseName(currentCount, isSample),
            input: "",
            output: "",
            isSample,
            score: isSample ? 0 : current.score,
          },
        ],
      };
    });
  }

  function updateTestCase(
    index: number,
    patch: Partial<AdminProblemTestCaseInput>
  ) {
    setForm((current) => ({
      ...current,
      testCases: current.testCases.map((testCase, currentIndex) =>
        currentIndex === index ? { ...testCase, ...patch } : testCase
      ),
    }));
  }

  function removeTestCase(index: number) {
    setForm((current) => ({
      ...current,
      testCases: current.testCases.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);
    if (validationIssues.length > 0) {
      return;
    }
    setShowValidation(false);
    const filledTestCases = form.testCases.filter(
      (testCase) => testCase.output.trim() !== ""
    );
    let nextPublicIndex = 0;
    let nextHiddenIndex = 0;
    await onSubmit({
      ...form,
      tags: parseTags(tagsInput),
      title: form.title.trim(),
      slug: form.slug.trim(),
      problemCode: form.problemCode.trim(),
      testCases: filledTestCases.map((testCase) => {
        const nextIndex = testCase.isSample ? nextPublicIndex++ : nextHiddenIndex++;
        return {
          ...testCase,
          name: testCase.name.trim() || defaultTestCaseName(nextIndex, testCase.isSample),
          score: testCase.isSample ? 0 : Math.max(0, Math.round(testCase.score)),
        };
      }),
    });
  }

  return (
    <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
      <section className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <TextField
            label="タイトル"
            onChange={updateTitle}
            required
            value={form.title}
          />
          <TextField
            label="slug"
            action={
              <button
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                onClick={applySlugFromTitle}
                type="button"
              >
                <Wand2 className="h-3 w-3" aria-hidden="true" />
                タイトルと同じ
              </button>
            }
            onChange={(value) => {
              setAutoSlug(false);
              update("slug", value);
            }}
            required
            value={form.slug}
          />
          <TextField
            label="問題コード"
            action={
              <button
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                onClick={applyProblemCodeFromTitle}
                type="button"
              >
                <Wand2 className="h-3 w-3" aria-hidden="true" />
                自動設定
              </button>
            }
            onChange={(value) => {
              setAutoProblemCode(false);
              update("problemCode", value);
            }}
            value={form.problemCode}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <NumberField
            label="実行時間制限 ms"
            min={1}
            onChange={(value) => update("timeLimitMs", value)}
            value={form.timeLimitMs}
          />
          <NumberField
            label="メモリ制限 MB"
            min={1}
            onChange={(value) => update("memoryLimitMb", value)}
            value={form.memoryLimitMb}
          />
          <NumberField
            label="得点"
            min={0}
            onChange={(value) => update("score", value)}
            value={form.score}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">難易度</span>
            <select
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => update("difficulty", event.target.value as ProblemDifficulty)}
              value={form.difficulty}
            >
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TextField
          label="タグ"
          onChange={setTagsInput}
          value={tagsInput}
        />

      </section>

      <section className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950">問題文 Markdown</h2>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={() => setPreview((value) => !value)}
            type="button"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {preview ? "編集" : "プレビュー"}
          </button>
        </div>

        {preview ? (
          <MarkdownPreview markdown={form.statement} />
        ) : (
          <textarea
            className="min-h-[360px] w-full resize-y rounded-md border border-zinc-300 bg-white p-3 font-mono text-sm leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => update("statement", event.target.value)}
            required
            value={form.statement}
          />
        )}
      </section>

      <section className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <TextAreaField
          label="制約"
          onChange={(value) => update("constraints", value)}
          value={form.constraints}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TextAreaField
            label="入力形式"
            onChange={(value) => update("inputFormat", value)}
            value={form.inputFormat}
          />
          <TextAreaField
            label="出力形式"
            onChange={(value) => update("outputFormat", value)}
            value={form.outputFormat}
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">公開テストケース</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {publicTestCases.length} / {maxPublicTestCases}
            </p>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={publicTestCases.length >= maxPublicTestCases}
            onClick={() => addTestCase(true)}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            追加
          </button>
        </div>

        {publicTestCases.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
            問題ページに表示する公開テストケースは未設定です。
          </div>
        ) : (
          <div className="grid gap-4">
            {publicTestCases.map(({ index, testCase }, displayIndex) => (
              <div
                className="grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4"
                key={`test-case-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={`公開 ${displayIndex + 1}`}
                      onChange={(value) => updateTestCase(index, { name: value })}
                      value={testCase.name}
                    />
                  </div>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => removeTestCase(index)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <TextAreaField
                    label="入力"
                    onChange={(value) => updateTestCase(index, { input: value })}
                    value={testCase.input}
                  />
                  <TextAreaField
                    label="正解出力"
                    onChange={(value) => updateTestCase(index, { output: value })}
                    required
                    value={testCase.output}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Hidden Test Cases</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hiddenTestCases.length} / {maxHiddenTestCases}
            </p>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={hiddenTestCases.length >= maxHiddenTestCases}
            onClick={() => addTestCase(false)}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            追加
          </button>
        </div>

        {hiddenTestCases.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
            提出時に実行する hidden test case は未設定です。
          </div>
        ) : (
          <div className="grid gap-4">
            {hiddenTestCases.map(({ index, testCase }, displayIndex) => (
              <div
                className="grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4"
                key={`test-case-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                    <TextField
                      label={`Hidden ${displayIndex + 1}`}
                      onChange={(value) => updateTestCase(index, { name: value })}
                      value={testCase.name}
                    />
                    <NumberField
                      label="得点"
                      min={0}
                      onChange={(value) => updateTestCase(index, { score: value })}
                      value={testCase.score}
                    />
                  </div>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => removeTestCase(index)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <TextAreaField
                    label="入力"
                    onChange={(value) => updateTestCase(index, { input: value })}
                    value={testCase.input}
                  />
                  <TextAreaField
                    label="正解出力"
                    onChange={(value) => updateTestCase(index, { output: value })}
                    required
                    value={testCase.output}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showValidation && validationIssues.length > 0 ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">保存前に修正してください</p>
          <ul className="mt-2 grid gap-1">
            {validationIssues.map((issue) => (
              <li key={issue}>・{issue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          href="/admin/problems"
        >
          キャンセル
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {mode === "create" ? "作成" : "保存"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  action,
  label,
  onChange,
  required,
  value,
}: {
  action?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const inputId = useId();

  return (
    <div className="block">
      <div className="mb-1 flex min-h-7 items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-700" htmlFor={inputId}>
          {label}
        </label>
        {action}
      </div>
      <input
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </div>
  );
}

function NumberField({
  label,
  min,
  onChange,
  value,
}: {
  label: string;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        required
        type="number"
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        className="min-h-32 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  if (!markdown.trim()) {
    return (
      <div className="min-h-[360px] rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        プレビューは空です。
      </div>
    );
  }

  return (
    <div className="min-h-[360px] rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-800">
      {markdown.split(/\n/).map((line, index) => (
        <PreviewLine index={index} key={`${index}-${line}`} line={line} />
      ))}
    </div>
  );
}

function PreviewLine({ index, line }: { index: number; line: string }) {
  if (line.startsWith("### ")) {
    return <h3 className="mt-4 text-base font-semibold text-zinc-950">{line.slice(4)}</h3>;
  }
  if (line.startsWith("## ")) {
    return <h2 className="mt-5 text-lg font-semibold text-zinc-950">{line.slice(3)}</h2>;
  }
  if (line.startsWith("# ")) {
    return <h1 className="mt-6 text-xl font-semibold text-zinc-950">{line.slice(2)}</h1>;
  }
  if (line.startsWith("- ")) {
    return <p className="pl-3">- {line.slice(2)}</p>;
  }
  if (line.trim() === "") {
    return <div className="h-3" aria-hidden="true" />;
  }
  if (line.startsWith("```")) {
    return <div className="mt-2 rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100">```</div>;
  }
  return <p className={index === 0 ? "" : "mt-1"}>{line}</p>;
}

function adminProblemToInput(problem: AdminProblem): AdminProblemInput {
  let nextPublicIndex = 0;
  let nextHiddenIndex = 0;
  return {
    constraints: problem.constraints,
    difficulty: problem.difficulty,
    inputFormat: problem.inputFormat,
    isPublic: problem.isPublic,
    memoryLimitMb: problem.memoryLimitMb,
    outputFormat: problem.outputFormat,
    problemCode: problem.problemCode,
    score: problem.score,
    slug: problem.slug,
    statement: problem.statement,
    tags: problem.tags,
    testCases: problem.testCases.map((testCase) => {
      const nextIndex = testCase.isSample ? nextPublicIndex++ : nextHiddenIndex++;
      return {
        ...testCase,
        name: testCase.name.trim() || defaultTestCaseName(nextIndex, testCase.isSample),
        score: testCase.isSample ? 0 : testCase.score > 0 ? testCase.score : problem.score,
      };
    }),
    timeLimitMs: problem.timeLimitMs,
    title: problem.title,
  };
}

function getValidationIssues(input: AdminProblemInput, mode: "create" | "edit") {
  const issues: string[] = [];
  const publicTestCases = input.testCases.filter((testCase) => testCase.isSample);
  const hiddenTestCases = input.testCases.filter((testCase) => !testCase.isSample);

  if (input.title.trim() === "") {
    issues.push("タイトルを入力してください。");
  }
  if (input.slug.trim() === "") {
    issues.push("slugを入力してください。");
  }
  if (input.statement.trim() === "") {
    issues.push("問題文 Markdown を入力してください。");
  }
  if (input.timeLimitMs <= 0) {
    issues.push("実行時間制限 ms は1以上にしてください。");
  }
  if (input.memoryLimitMb <= 0) {
    issues.push("メモリ制限 MB は1以上にしてください。");
  }
  if (input.score < 0) {
    issues.push("得点は0以上にしてください。");
  }
  if (publicTestCases.length > maxPublicTestCases) {
    issues.push(`公開テストケースは最大${maxPublicTestCases}件までです。`);
  }
  if (hiddenTestCases.length > maxHiddenTestCases) {
    issues.push(`Hidden test case は最大${maxHiddenTestCases}件までです。`);
  }

  let publicIndex = 0;
  let hiddenIndex = 0;
  input.testCases.forEach((testCase) => {
    const label = testCase.isSample
      ? `公開テストケース ${++publicIndex}`
      : `Hidden ${++hiddenIndex}`;
    if (testCase.output.trim() === "") {
      issues.push(`${label} の正解出力を入力してください。`);
    }
    if (testCase.score < 0) {
      issues.push(`${label} の得点は0以上にしてください。`);
    }
  });

  if (input.isPublic) {
    if (mode === "create") {
      issues.push("作成時は公開状態をOFFにしてください。作成後に公開できます。");
    }
    if (publicTestCases.length === 0) {
      issues.push("公開するには公開テストケースが1つ以上必要です。");
    }
  }

  return issues;
}

function slugFromTitle(title: string) {
  return title.trim().replace(/[/?#]+/g, "-").replace(/\s+/g, " ");
}

function problemCodeFromTitle(title: string) {
  const source = title.split(/\s+-\s+|[:：]/)[0] || title;
  const code = source
    .normalize("NFKC")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return code || "PROBLEM";
}

function defaultTestCaseName(index: number, isSample: boolean) {
  const number = String(index + 1).padStart(2, "0");
  return isSample ? `sample_${number}` : `hidden_${number}`;
}

function parseTags(value: string) {
  return value
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
