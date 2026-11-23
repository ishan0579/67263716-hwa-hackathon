import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/product/snifforbit-one", priority: 0.9, freq: "weekly" },
    { path: "/how-it-works", priority: 0.8, freq: "monthly" },
    { path: "/experience", priority: 0.7, freq: "monthly" },
    { path: "/customize", priority: 0.8, freq: "weekly" },
    { path: "/dog-match", priority: 0.6, freq: "monthly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
    { path: "/faq", priority: 0.5, freq: "monthly" },
    { path: "/contact", priority: 0.4, freq: "yearly" },
    { path: "/order/track", priority: 0.3, freq: "yearly" },
    { path: "/shipping-returns", priority: 0.3, freq: "yearly" },
    { path: "/privacy", priority: 0.2, freq: "yearly" },
    { path: "/terms", priority: 0.2, freq: "yearly" },
  ];
  return routes.map((r) => ({ url: `${SITE.url}${r.path}`, changeFrequency: r.freq, priority: r.priority }));
}
