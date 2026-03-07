import React from 'react';
import { Circle, Path, Svg, } from 'react-native-svg';

interface AirsBrandMarkProps {
  size?: number | string;
  fillColor?: string;
  cutoutColor?: string;
}

export default function AirsBrandMark({
  size = 56,
  fillColor = '#1ee6b5',
  cutoutColor = '#03353b',
}: AirsBrandMarkProps,): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox='0 0 256 256' fill='none'>
      <Circle cx='128' cy='128' r='110' fill={fillColor} />
      <Path
        d='m83.023929 184.2548c0 0-27.780611-4.73633-6.150891-33.88575l70.876382-79.573402c9.89575-10.143488 30.4878-9.472689 31.84836 3.353989l1.3895 70.405823c.53291 27.0023 5.90897 40.76527-10.8054 40.59374z'
        fill={cutoutColor}
      />
    </Svg>
  );
}
