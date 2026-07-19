import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money — Expense Tracker",
    short_name: "Money",
    description: "Personal income & expense tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
