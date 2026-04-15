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
  title: 'Airs by Alternun',
  description: 'Tu plataforma de puntuación regenerativa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' className={anekLatin.variable} suppressHydrationWarning>
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
      <body className='bg-navy min-h-screen antialiased font-sans'>
        <ThemeProvider>
          {children}
          <ReleaseUpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
