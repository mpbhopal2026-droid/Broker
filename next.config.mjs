/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Never ship source maps of server code to the browser.
  productionBrowserSourceMaps: false,

  // Don't advertise the framework version to scanners.
  poweredByHeader: false,

  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  images: {
    // Was `hostname: "**"`, which let any origin be proxied through the image
    // optimizer — the exact configuration called out in GHSA-9g9p-9gw9-jx7f as
    // a DoS vector, and an open image proxy besides. Allow-list only what the
    // app actually renders.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // Bound the optimizer's work rather than leaving it caller-controlled.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },
};

export default nextConfig;
