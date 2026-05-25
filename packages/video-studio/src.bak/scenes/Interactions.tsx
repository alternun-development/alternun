import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BrowserFrame } from '../components/BrowserFrame';

export const InteractionsScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Main browser frame with zoom animation */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: interpolate(frame, [0, 40], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `scale(${interpolate(frame, [100, 200], [1, 0.95], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.inOut(Easing.quad),
            })})`,
            transformOrigin: 'center',
          }}
        >
          <BrowserFrame
            title='AIRS - Transactions & Staking'
            url='https://testnet.airs.alternun.co/transactions'
            showCursor={true}
            content={<TransactionsContent frame={frame} />}
          />
        </div>

        {/* Focus highlight overlay */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 50%, transparent 20%, rgba(0, 0, 0, 0.4))`,
            opacity: interpolate(frame, [300, 400], [0, 0.5], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const TransactionsContent: React.FC<{ frame: number }> = ({ frame }) => {
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
      {/* Navigation tabs */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
          paddingBottom: '16px',
          marginBottom: '32px',
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {['Transactions', 'Staking', 'Governance', 'Yield'].map((tab, idx) => (
          <div
            key={idx}
            style={{
              padding: '8px 0',
              borderBottom: idx === 0 ? '2px solid #00d9ff' : '2px solid transparent',
              cursor: 'pointer',
              color: idx === 0 ? '#00d9ff' : '#666',
              transition: 'all 0.3s ease',
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Transactions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          {
            type: 'Deposit',
            amount: '50,000 USDC',
            status: 'Confirmed',
            time: '2 hours ago',
            delay: 60,
          },
          {
            type: 'Stake Gold',
            amount: '2,500 oz',
            status: 'Confirmed',
            time: '4 hours ago',
            delay: 100,
          },
          {
            type: 'Claim Rewards',
            amount: '1,245 USDC',
            status: 'Confirmed',
            time: '1 day ago',
            delay: 140,
          },
          {
            type: 'Ecosystem Grant',
            amount: '500 Trees',
            status: 'Pending',
            time: 'In Progress',
            delay: 180,
          },
        ].map((tx, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background:
                'linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(0, 153, 204, 0.03))',
              border: '1px solid rgba(0, 217, 255, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              opacity: interpolate(frame, [tx.delay, tx.delay + 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              transform: `translateX(${
                interpolate(frame, [tx.delay, tx.delay + 30], [-30, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }) * -1
              }px)`,
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{tx.type}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{tx.time}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{tx.amount}</div>
              <div
                style={{
                  fontSize: '12px',
                  color: tx.status === 'Confirmed' ? '#00d9ff' : '#ffa500',
                  marginTop: '4px',
                }}
              >
                {tx.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '32px',
          opacity: interpolate(frame, [250, 300], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <button
          style={{
            flex: 1,
            padding: '12px',
            background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Deposit Now
        </button>
        <button
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            color: '#00d9ff',
            border: '1px solid #00d9ff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View History
        </button>
      </div>
    </div>
  );
};
