import type { Metadata } from "next";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const raw = window.localStorage.getItem("ace_playground_settings_v1");
    const theme = raw ? JSON.parse(raw).theme : undefined;
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  } catch {
    document.documentElement.classList.add("dark");
  }
})();
`;

export const metadata: Metadata = {
  title: "Wait for Judge",
  description: "ISC Wait for Judge - Online Judge System",
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
