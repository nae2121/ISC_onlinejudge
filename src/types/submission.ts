export type JudgeStatus = "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OLE" | "IE";

export type RunResult = {
  status: JudgeStatus;
  stdout: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
};

export type SubmitResult = {
  submissionId: number;
  status: JudgeStatus;
  score: number;
  scoreAdded: boolean;
  alreadySolved: boolean;
};
