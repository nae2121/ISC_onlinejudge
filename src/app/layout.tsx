import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Judge0 Playground",
  description: "A Next.js frontend for the local Judge0 demo"
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
