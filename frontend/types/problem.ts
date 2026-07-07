export type SampleCase = {
  id: number;
  title: string;
  input: string;
  output: string;
  explanation?: string;
};

export type Problem = {
  id: number;
  slug: string;
  code: string;
  title: string;
  score: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  statement: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  samples: SampleCase[];
  solved?: boolean;
};
