import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fixion.education';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/contact', '/privacy', '/terms'],
        disallow: ['/admin/', '/student/', '/teacher/', '/onboarding/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
