import React from 'react';
import { Composition } from 'remotion';
import { AirsDemo } from './compositions/AirsDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id='AirsDemo'
        component={AirsDemo}
        durationInFrames={5400}
        fps={30}
        width={1440}
        height={810}
        defaultProps={{}}
      />
    </>
  );
};
