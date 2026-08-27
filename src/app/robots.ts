import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3005";

// Crawl the public marketing + legal pages; keep the authenticated app and BFF out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/deals", "/account", "/verify", "/onboarding"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
