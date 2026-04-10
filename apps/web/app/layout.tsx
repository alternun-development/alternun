import type { Metadata } from 'next';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner';
import ThemeProvider from '../components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Airs by Alternun',
  description: 'Tu plataforma de puntuación regenerativa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' suppressHydrationWarning>
      <head>
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
      <body className='bg-navy min-h-screen antialiased'>
        <ThemeProvider>
          {children}
          <ReleaseUpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
