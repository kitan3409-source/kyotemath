import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "共テ数学60",
  description: "高校数学を1概念ずつつなぎ、共通テスト6割を目指す学習PWA。",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
