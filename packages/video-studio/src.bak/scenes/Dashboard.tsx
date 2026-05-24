import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BrowserFrame } from '../components/BrowserFrame';

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f' }}>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: interpolate(frame, [0, 60], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
        }}
      >
        <BrowserFrame
          title='AIRS Dashboard'
          url='https://testnet.airs.alternun.co/dashboard'
          showCursor={true}
          content={<DashboardContent frame={frame} />}
        />
      </div>
    </AbsoluteFill>
  );
};

const DashboardContent: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        padding: '40px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#00d9ff' }}>Portfolio Overview</h1>
        <div style={{ fontSize: '14px', color: '#888' }}>Connected • Mainnet</div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        {[
          {
            label: 'Total Assets',
            value: '$2,450,000',
            change: '+12.5%',
            delay: 30,
          },
          {
            label: 'Gold Reserve',
            value: '45,200 oz',
            change: '+8.3%',
            delay: 60,
          },
          {
            label: 'Staking Rewards',
            value: '$48,500',
            change: '+24.2%',
            delay: 90,
          },
          {
            label: 'Ecosystem Impact',
            value: '2,400 trees',
            change: '+340 new',
            delay: 120,
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background:
                'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(0, 153, 204, 0.05))',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '12px',
              padding: '24px',
              opacity: interpolate(frame, [stat.delay, stat.delay + 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              transform: `translateY(${
                interpolate(frame, [stat.delay, stat.delay + 30], [20, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }) * -1
              }px)`,
            }}
          >
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#00d9ff' }}>{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.05), rgba(0, 153, 204, 0.02))',
          border: '1px solid rgba(0, 217, 255, 0.15)',
          borderRadius: '12px',
          padding: '24px',
          height: '200px',
          opacity: interpolate(frame, [200, 250], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
          Asset Growth (Last 30 Days)
        </div>
        <svg
          style={{ width: '100%', height: '100%' }}
          viewBox='0 0 500 150'
          preserveAspectRatio='none'
        >
          <polyline
            points='0,120 50,90 100,70 150,80 200,50 250,40 300,55 350,35 400,45 450,20 500,15'
            fill='none'
            stroke='#00d9ff'
            strokeWidth='2'
            opacity='0.8'
          />
          <polyline
            points='0,120 50,90 100,70 150,80 200,50 250,40 300,55 350,35 400,45 450,20 500,15'
            fill='url(#gradient)'
            opacity='0.2'
          />
          <defs>
            <linearGradient id='gradient' x1='0%' y1='0%' x2='0%' y2='100%'>
              <stop offset='0%' style={{ stopColor: '#00d9ff', stopOpacity: 0.3 }} />
              <stop offset='100%' style={{ stopColor: '#00d9ff', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
