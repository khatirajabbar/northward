import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// one typeface for everything: light, round and open. the file is kept in the
// project (fonts/), so the site never waits on someone else's server for it
const sans = localFont({ src: "./fonts/albert-sans.woff2", weight: "100 900", variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "northward", template: "%s — northward" },
  description: "A quiet adventure through a Swedish forest. Plays in your browser.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
