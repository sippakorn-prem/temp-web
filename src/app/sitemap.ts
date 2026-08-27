import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

// Public, indexable URLs. The landing is emitted per-locale with hreflang alternates so search
// engines serve the right language; legal pages are shared.
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${siteUrl}/en`, th: `${siteUrl}/th` };
  return [
    { url: `${siteUrl}/en`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${siteUrl}/th`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${siteUrl}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
