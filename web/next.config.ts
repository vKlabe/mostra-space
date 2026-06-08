import type { NextConfig } from "next";

const unityBuildCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=3600, stale-while-revalidate=86400",
  },
];

const unityTemplateCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=3600, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/unity/artportal-viewer/Build/:path*",
        headers: unityBuildCacheHeaders,
      },
      {
        source: "/unity/artportal-viewer/TemplateData/:path*",
        headers: unityTemplateCacheHeaders,
      },
    ];
  },
};

export default nextConfig;