import type { Metadata } from 'next';
import localFont from 'next/font/local';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner';
import ThemeProvider from '../components/ThemeProvider';
import './globals.css';

const anekLatin = localFont({
  src: '../../mobile/assets/fonts/Anek_latin/AnekLatin-VariableFont_wdth,wght.ttf',
  variable: '--font-anek-latin',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Alternun - Regenerative Impact Platform',
  description:
    'Track, verify, and monetize your environmental and social impact with AIRS (Alternun Impact Rating System). Join the regenerative economy.',
  metadataBase: new URL('https://alternun.co'),
  alternates: {
    types: {
      'application/rss+xml': 'https://alternun.co/feed.xml',
      'application/atom+xml': 'https://alternun.co/feed.atom',
    },
  },
  openGraph: {
    title: 'Alternun - Regenerative Impact Platform',
    description: 'Track, verify, and monetize positive environmental and social impact',
    url: 'https://alternun.co',
    type: 'website',
    images: [
      {
        url: 'https://alternun.co/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' className={anekLatin.variable} suppressHydrationWarning>
      <head>
        {/* Feed discovery */}
        <link
          rel='alternate'
          type='application/rss+xml'
          href='https://alternun.co/feed.xml'
          title='Alternun Blog'
        />
        <link
          rel='alternate'
          type='application/atom+xml'
          href='https://alternun.co/feed.atom'
          title='Alternun Blog'
        />

        {/* JSON-LD Schemas for Knowledge Graph and Rich Results */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Alternun',
              url: 'https://alternun.co',
              logo: 'https://alternun.co/logo.png',
              description:
                'Regenerative impact platform that enables individuals and organizations to track, verify, and monetize their positive environmental and social contributions.',
              sameAs: [
                'https://www.linkedin.com/company/alternun',
                'https://github.com/alternun',
                'https://twitter.com/alternun',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Support',
                email: 'contact@alternun.io',
                url: 'https://alternun.co/support',
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Carrera 7 #71-21',
                addressLocality: 'Bogotá',
                addressRegion: 'DC',
                addressCountry: 'CO',
              },
              founder: {
                '@type': 'Person',
                name: 'Alternun Team',
              },
            }),
          }}
        />

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Alternun',
              url: 'https://alternun.co',
              description: 'Track, verify, and monetize positive environmental and social impact',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://alternun.co/search?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* Prevent flash of unstyled content during theme initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme-preference') || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className='bg-navy min-h-screen antialiased font-sans'>
        <ThemeProvider>
          {children}
          <ReleaseUpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
