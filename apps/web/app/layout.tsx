import type { Metadata } from 'next';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Airs by Alternun',
  description: 'Tu plataforma de puntuación regenerativa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es'>
      <body className='bg-navy min-h-screen antialiased'>
        {children}
        <ReleaseUpdateBanner />
      </body>
    </html>
  );
}
