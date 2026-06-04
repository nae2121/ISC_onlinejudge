import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
