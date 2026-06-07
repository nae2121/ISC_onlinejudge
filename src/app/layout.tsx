import type { Metadata } from "next";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const raw = window.localStorage.getItem("ace_playground_settings_v1");
    const theme = raw ? JSON.parse(raw).theme : undefined;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === "dark" || (!theme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {
  }
})();
`;

export const metadata: Metadata = {
  title: "Wait for Judge",
  description: "A Next.js frontend for the local Judge0 demo",
  icons: {
    icon: "/static/image/WfJlogo.png",
    shortcut: "/static/image/WfJlogo.png",
    apple: "/static/image/WfJlogo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
