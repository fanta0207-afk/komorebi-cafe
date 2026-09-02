import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "こもれび喫茶",
  description: "レトロかわいい喫茶店経営と、街の人との日々を楽しむゲーム。",
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
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
