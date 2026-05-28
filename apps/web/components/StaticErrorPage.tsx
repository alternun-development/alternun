interface StaticErrorPageProps {
  code: number;
  eyebrow: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

export default function StaticErrorPage({
  code,
  eyebrow,
  title,
  message,
  actionLabel,
  actionHref,
}: StaticErrorPageProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: '#050510',
        color: '#f1f5f9',
        fontFamily:
          'var(--font-anek-latin), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.875rem', letterSpacing: '0.18em', color: '#1EE6B5' }}>
        {eyebrow}
      </p>
      <h1
        style={{ margin: '1rem 0 0.75rem', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1 }}
      >
        {code} {title}
      </h1>
      <p
        style={{ margin: 0, maxWidth: 560, fontSize: '1.05rem', lineHeight: 1.6, color: '#cbd5e1' }}
      >
        {message}
      </p>
      <a
        href={actionHref}
        style={{
          marginTop: '2rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9999,
          padding: '0.85rem 1.25rem',
          background: '#1EE6B5',
          color: '#050510',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        {actionLabel}
      </a>
    </main>
  );
}
