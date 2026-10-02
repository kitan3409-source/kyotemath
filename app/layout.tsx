import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "受験OS",
  description: "2027共通テストの9科目を単元学習・記録・志望校シミュレーションでつなぐ受験OS。目標は合計60〜70%。",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "受験OS",
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
