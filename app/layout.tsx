import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "共テ数学60",
  description: "高校数学を1概念ずつつなぎ、共通テスト6割を目指す学習PWA。",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "数学60",
    "format-detection": "telephone=no",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0c1013" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
