import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#3c291b" };

export const metadata: Metadata = {
  title: "こもれび喫茶",
  description: "レトロかわいい喫茶店経営と、街の人との日々を楽しむゲーム。",
  appleWebApp: { capable:true, title:"こもれび喫茶", statusBarStyle:"black" },
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
