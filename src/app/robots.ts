import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.globalforex.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/markets',
          '/market',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/legal',
          '/legal/',
          '/login',
          '/register',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/admin',
          '/dashboard/',
          '/dashboard',
          '/trade/',
          '/trade',
          '/wallet/',
          '/wallet',
          '/kyc/',
          '/kyc',
          '/profile/',
          '/profile',
          '/onboarding/',
          '/onboarding',
          '/deposit/',
          '/withdraw/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
