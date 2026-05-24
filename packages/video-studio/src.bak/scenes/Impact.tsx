import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

export const ImpactScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a3d2e 0%, #0f1f2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '60px',
      }}
    >
      {/* Floating particles background */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              background: `radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)`,
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + i}s ease-in-out infinite`,
              opacity: interpolate(frame, [0, 60], [0, 0.3], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '56px',
          fontWeight: 700,
          marginBottom: '40px',
          textAlign: 'center',
          opacity: interpolate(frame, [0, 60], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
          transform: `translateY(${
            interpolate(frame, [0, 60], [40, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }) * -1
          }px)`,
        }}
      >
        Regenerative Finance
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '24px',
          color: '#a0a0a0',
          marginBottom: '60px',
          textAlign: 'center',
          maxWidth: '600px',
          opacity: interpolate(frame, [40, 120], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
        }}
      >
        Digital gold backed by verified reserves. Transparent. Trustless. Environmental impact.
      </p>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px',
          marginBottom: '60px',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        {[
          { label: 'Gold Verified', value: '125,000 oz', delay: 100 },
          { label: 'Trees Planted', value: '34,500', delay: 140 },
          { label: 'CO₂ Offset', value: '12,450 tons', delay: 180 },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              opacity: interpolate(frame, [stat.delay, stat.delay + 40], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              }),
              transform: `scale(${interpolate(frame, [stat.delay, stat.delay + 40], [0.8, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 700,
                color: '#00d9ff',
                marginBottom: '12px',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Key features */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '600px',
          opacity: interpolate(frame, [300, 360], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          }),
        }}
      >
        {['Blockchain Verified Gold', 'Decentralized Governance', 'Impact Tracking'].map(
          (feature, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#00d9ff',
                  borderRadius: '50%',
                }}
              />
              <span style={{ fontSize: '16px' }}>{feature}</span>
            </div>
          )
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-40px) translateX(0px); }
          75% { transform: translateY(-20px) translateX(-10px); }
        }
      `}</style>
    </AbsoluteFill>
  );
};
