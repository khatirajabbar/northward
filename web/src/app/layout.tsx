import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Wake from "@/components/Wake";

// one typeface for everything: light, round and open. the file is kept in the
// project (fonts/), so the site never waits on someone else's server for it
const sans = localFont({ src: "./fonts/albert-sans.woff2", weight: "100 900", variable: "--font-sans" });
// a second, typewriter face for the small "machine" lines: the path above a
// title, the typed line under the bar, the status panel
const mono = localFont({ src: "./fonts/dm-mono.woff2", weight: "300", variable: "--font-mono" });
// three more, used only by the name in the bar as it changes typeface
// (components/Name.tsx). not fetched until the name first needs them
const serif = localFont({ src: "./fonts/instrument-serif.woff2", weight: "400", variable: "--font-serif", preload: false });
const gothic = localFont({ src: "./fonts/unifrakturmaguntia.woff2", weight: "400", variable: "--font-gothic", preload: false });
const pixel = localFont({ src: "./fonts/pixelify-sans.woff2", weight: "400", variable: "--font-pixel", preload: false });

export const metadata: Metadata = {
  title: { default: "northward", template: "%s — northward" },
  description: "A quiet adventure through a Swedish forest. Plays in your browser.",
  // kept on a phone's home screen (app/manifest.ts), it opens without the browser's bars
  appleWebApp: { capable: true, title: "northward", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} ${gothic.variable} ${pixel.variable}`}>
      <body>
        {children}
        <Wake />
      </body>
    </html>
  );
}
