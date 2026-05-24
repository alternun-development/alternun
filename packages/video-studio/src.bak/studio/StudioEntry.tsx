import React, { useState } from 'react';
import { RecordingStudio } from './RecordingStudio';

type View = 'home' | 'recording-studio' | 'remotion';

export const StudioEntry: React.FC = () => {
  const [view, setView] = useState<View>('home');

  if (view === 'recording-studio') {
    return <RecordingStudio />;
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '60px',
        }}
      >
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 900,
            margin: '0 0 20px 0',
            color: '#00d9ff',
            letterSpacing: '2px',
            textShadow: '0 0 30px rgba(0, 217, 255, 0.5)',
          }}
        >
          AIRS Studio
        </h1>
        <p
          style={{
            fontSize: '24px',
            color: '#a0a0a0',
            margin: '0',
            fontWeight: 300,
            letterSpacing: '1px',
          }}
        >
          Professional Video Production Suite
        </p>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          maxWidth: '1200px',
          width: '100%',
          marginBottom: '60px',
        }}
      >
        {/* Recording Studio Card */}
        <Card
          title='🎬 Recording Studio'
          description='Track projects, manage recordings, and monitor video production workflow'
          features={[
            'Project management',
            'Recording history',
            'Duration tracking',
            'Frame counting',
          ]}
          onClick={() => setView('recording-studio')}
          primary
        />

        {/* Remotion Studio Card */}
        <Card
          title='🎨 Remotion Studio'
          description='Live preview and composition editor for AIRS demo video'
          features={[
            'Timeline scrubbing',
            'Hot reload',
            'Frame-by-frame control',
            'Real-time rendering',
          ]}
          onClick={() => window.location.reload()}
        />

        {/* Documentation Card */}
        <Card
          title='📚 Documentation'
          description='Comprehensive guides for video production and setup'
          features={[
            'Quick start guide',
            'Storyboard reference',
            'FFmpeg recipes',
            'Troubleshooting',
          ]}
          onClick={() => {
            // Link to docs
            alert('Open: packages/video-studio/README.md');
          }}
        />
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          maxWidth: '1000px',
          width: '100%',
          marginBottom: '60px',
        }}
      >
        {[
          { label: 'Total Scenes', value: '7' },
          { label: 'Video Duration', value: '3 min' },
          { label: 'Target FPS', value: '30' },
          { label: 'Resolution', value: '1440p' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '20px',
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d9ff' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '14px',
          maxWidth: '600px',
        }}
      >
        <p style={{ margin: '0 0 12px 0' }}>
          AIRS Video Studio — Production suite for demo video composition
        </p>
        <p style={{ margin: '0', fontSize: '12px' }}>
          Built with Remotion 4.0.206 • React 19 • TypeScript
        </p>
      </div>
    </div>
  );
};

interface CardProps {
  title: string;
  description: string;
  features: string[];
  onClick: () => void;
  primary?: boolean;
}

const Card: React.FC<CardProps> = ({ title, description, features, onClick, primary }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '24px',
        background: primary
          ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(0, 153, 204, 0.05))'
          : 'rgba(0, 217, 255, 0.05)',
        border: primary ? '2px solid rgba(0, 217, 255, 0.3)' : '1px solid rgba(0, 217, 255, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0, 217, 255, 0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.borderColor = primary
          ? 'rgba(0, 217, 255, 0.3)'
          : 'rgba(0, 217, 255, 0.1)';
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          fontWeight: 700,
          color: '#00d9ff',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#a0a0a0',
          flex: 1,
        }}
      >
        {description}
      </p>

      <ul
        style={{
          margin: '0',
          padding: '0',
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: 'auto',
        }}
      >
        {features.map((feature) => (
          <li
            key={feature}
            style={{
              fontSize: '12px',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ color: '#00d9ff' }}>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: primary
            ? 'linear-gradient(135deg, #00d9ff, #0099cc)'
            : 'rgba(0, 217, 255, 0.2)',
          color: primary ? '#000' : '#00d9ff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        Open
      </button>
    </div>
  );
};
