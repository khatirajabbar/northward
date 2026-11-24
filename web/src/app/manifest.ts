import type { MetadataRoute } from "next";

// What a phone needs to keep northward on its home screen. Opened from there it
// starts at the play page, on its side, with all of the screen — no browser bars.
// (The icon is the bird from the tab, drawn larger: public/icon-192.png and
// icon-512.png, and app/apple-icon.png for iPhones.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "northward",
    short_name: "northward",
    description: "A quiet adventure through a Swedish forest.",
    start_url: "/play",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
