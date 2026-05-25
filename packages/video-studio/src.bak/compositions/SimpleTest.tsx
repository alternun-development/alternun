import React from 'react';
import { AbsoluteFill } from 'remotion';

export const SimpleTest: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0f0f1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        color: '#00d9ff',
        fontFamily: 'system-ui',
      }}
    >
      ✅ Remotion Studio is Working!
    </AbsoluteFill>
  );
};
