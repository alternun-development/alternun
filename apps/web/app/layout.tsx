import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner';

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang='en'>
      <body>
        {children}
        <ReleaseUpdateBanner />
      </body>
    </html>
  );
}
