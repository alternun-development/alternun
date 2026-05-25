import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

export const ResponsiveScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f' }}>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px',
          padding: '60px',
        }}
      >
        {/* Desktop view */}
        <div
          style={{
            opacity: interpolate(frame, [0, 40], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translateX(${interpolate(frame, [40, 120], [0, -30], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            })}px) scale(${interpolate(frame, [200, 280], [1, 0.8], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })})`,
          }}
        >
          <DeviceFrame type='desktop' width={320} height={240} title='Desktop' />
        </div>

        {/* Mobile view */}
        <div
          style={{
            opacity: interpolate(frame, [60, 100], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translateX(${interpolate(frame, [100, 180], [0, 30], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            })}px) scale(${interpolate(frame, [200, 280], [1, 0.8], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })})`,
          }}
        >
          <DeviceFrame type='mobile' width={140} height={240} title='Mobile' />
        </div>
      </div>
    </AbsoluteFill>
  );
};

interface DeviceFrameProps {
  type: 'desktop' | 'mobile';
  width: number;
  height: number;
  title: string;
}

const DeviceFrame: React.FC<DeviceFrameProps> = ({ type, width, height, title }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Device */}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
          borderRadius: type === 'mobile' ? '32px' : '12px',
          border: type === 'mobile' ? '8px solid #222' : '1px solid #333',
          boxShadow: '0 20px 60px rgba(0, 217, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Notch (mobile only) */}
        {type === 'mobile' && (
          <div
            style={{
              height: '24px',
              background: '#000',
              borderRadius: '0 0 16px 16px',
              marginBottom: '8px',
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00d9ff',
            fontSize: type === 'mobile' ? '8px' : '12px',
            fontWeight: 600,
          }}
        >
          <div>AIRS</div>
          <div style={{ fontSize: type === 'mobile' ? '6px' : '10px' }}>Dashboard</div>
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          marginTop: '16px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Responsive Design</div>
    </div>
  );
};
