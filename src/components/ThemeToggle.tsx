"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppSettings, ThemeName } from "@/components/types";

const APP_SETTINGS_KEY = "ace_playground_settings_v1";

type ThemeToggleProps = {
  variant?: "dark" | "light";
};

export function ThemeToggle({ variant = "light" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    const nextTheme = readTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);

    const handleThemeChange = (event: Event) => {
      const changedTheme = (event as CustomEvent<ThemeName>).detail;
      if (changedTheme === "dark" || changedTheme === "light") {
        setTheme(changedTheme);
      }
    };

    window.addEventListener("wfj:theme-change", handleThemeChange);
    return () => window.removeEventListener("wfj:theme-change", handleThemeChange);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    writeTheme(nextTheme);
  }

  const darkButton =
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]";
  const lightButton =
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50";

  return (
    <button
      className={variant === "dark" ? darkButton : lightButton}
      onClick={toggleTheme}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      type="button"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

function readTheme(): ThemeName {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
    const settings = raw ? (JSON.parse(raw) as AppSettings) : {};
    if (settings.theme === "dark" || settings.theme === "light") {
      return settings.theme;
    }
  } catch {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeName) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new CustomEvent<ThemeName>("wfj:theme-change", { detail: theme }));
}

function writeTheme(theme: ThemeName) {
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
    const settings = raw ? (JSON.parse(raw) as AppSettings) : {};
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ ...settings, theme }));
  } catch {
    // The theme still applies for the current page even if localStorage is unavailable.
  }
}
