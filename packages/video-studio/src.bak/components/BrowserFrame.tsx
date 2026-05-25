import React from 'react';

interface BrowserFrameProps {
  title: string;
  url: string;
  showCursor?: boolean;
  content: React.ReactNode;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  title,
  url,
  showCursor = true,
  content,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          background: '#f3f3f3',
          borderBottom: '1px solid #ddd',
          padding: '0 16px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Traffic lights */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#ed6158',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#fcc02e',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#5fc038',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            marginLeft: '8px',
            fontSize: '12px',
            color: '#666',
            fontWeight: 500,
          }}
        >
          {url}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {content}
        {showCursor && (
          <div
            style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              style={{ color: '#000', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              <path d='M3 3l8.889 16.669l3.505-3.505l10.524-1.159L3 3z' />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
