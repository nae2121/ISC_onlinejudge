export type ThemeName = "light" | "dark";

export type RunStatus = "idle" | "submitting" | "polling" | "done" | "error";

export type AppSettings = {
  font?: number;
  languageId?: string;
  live?: boolean;
  mode?: string;
  theme?: ThemeName;
};

export type JudgeSettings = {
  authnHeader?: string;
  authnToken?: string;
  base64?: boolean;
  fields?: string;
  wait?: boolean;
};
