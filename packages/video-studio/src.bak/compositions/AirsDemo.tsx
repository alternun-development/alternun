import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { IntroScene } from '../scenes/Intro';
import { LoginScene } from '../scenes/Login';
import { DashboardScene } from '../scenes/Dashboard';
import { InteractionsScene } from '../scenes/Interactions';
import { ImpactScene } from '../scenes/Impact';
import { ResponsiveScene } from '../scenes/Responsive';
import { OutroScene } from '../scenes/Outro';

const FRAME_RATES = {
  // Each scene duration in frames (30fps)
  intro: 450, // 0:00 - 0:15
  login: 600, // 0:15 - 0:35
  dashboard: 1050, // 0:35 - 1:10
  interactions: 1200, // 1:10 - 1:50
  impact: 900, // 1:50 - 2:20
  responsive: 600, // 2:20 - 2:40
  outro: 600, // 2:40 - 3:00
};

export const AirsDemo: React.FC = () => {
  const frameStart = {
    intro: 0,
    login: FRAME_RATES.intro,
    dashboard: FRAME_RATES.intro + FRAME_RATES.login,
    interactions: FRAME_RATES.intro + FRAME_RATES.login + FRAME_RATES.dashboard,
    impact:
      FRAME_RATES.intro + FRAME_RATES.login + FRAME_RATES.dashboard + FRAME_RATES.interactions,
    responsive:
      FRAME_RATES.intro +
      FRAME_RATES.login +
      FRAME_RATES.dashboard +
      FRAME_RATES.interactions +
      FRAME_RATES.impact,
    outro:
      FRAME_RATES.intro +
      FRAME_RATES.login +
      FRAME_RATES.dashboard +
      FRAME_RATES.interactions +
      FRAME_RATES.impact +
      FRAME_RATES.responsive,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f0f0f' }}>
      {/* SCENE 1: INTRO */}
      <Sequence from={frameStart.intro} durationInFrames={FRAME_RATES.intro}>
        <IntroScene />
      </Sequence>

      {/* SCENE 2: LOGIN */}
      <Sequence from={frameStart.login} durationInFrames={FRAME_RATES.login}>
        <LoginScene />
      </Sequence>

      {/* SCENE 3: DASHBOARD */}
      <Sequence from={frameStart.dashboard} durationInFrames={FRAME_RATES.dashboard}>
        <DashboardScene />
      </Sequence>

      {/* SCENE 4: INTERACTIONS */}
      <Sequence from={frameStart.interactions} durationInFrames={FRAME_RATES.interactions}>
        <InteractionsScene />
      </Sequence>

      {/* SCENE 5: IMPACT */}
      <Sequence from={frameStart.impact} durationInFrames={FRAME_RATES.impact}>
        <ImpactScene />
      </Sequence>

      {/* SCENE 6: RESPONSIVE */}
      <Sequence from={frameStart.responsive} durationInFrames={FRAME_RATES.responsive}>
        <ResponsiveScene />
      </Sequence>

      {/* SCENE 7: OUTRO */}
      <Sequence from={frameStart.outro} durationInFrames={FRAME_RATES.outro}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
