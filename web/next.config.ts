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

const serviceWorkerHeaders = [
  {
    key: "Content-Type",
    value: "application/javascript; charset=utf-8",
  },
  {
    key: "Cache-Control",
    value: "no-cache, no-store, must-revalidate",
  },
  {
    key: "Service-Worker-Allowed",
    value: "/",
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
      {
        source: "/sw.js",
        headers: serviceWorkerHeaders,
      },
    ];
  },
};

export default nextConfig;
