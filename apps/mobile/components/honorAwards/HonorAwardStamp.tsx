import React, { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import type { HonorAwardStampProps } from './honorAwards.types';

const MINT = '#1de9b6';
/** The Airs leaf, from assets/AIRS-logo-dark.svg (256 × 256 view box). */
const AIRS_LEAF =
  'm 83.902145,182.71792 c 0,0 -27.780611,-4.73633 -6.150891,-33.88575 l 70.876386,-79.5734 c 9.89575,-10.143488 30.4878,-9.472689 31.84836,3.353989 l 1.3895,70.405821 c 0.53291,27.0023 5.90897,40.76527 -10.8054,40.59374 z';

/**
 * The round seal on the card back ("PROYECTO AIRS 2026 • IMPACTO POSITIVO AMBIENTAL"): the
 * text runs around a ring and the Airs leaf sits in the middle with a holographic sheen.
 */
export default function HonorAwardStamp({ text, size }: HonorAwardStampProps): React.JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ringId = `honor-stamp-ring-${uid}`;
  const holoId = `honor-stamp-holo-${uid}`;
  // The ring path starts at the left and runs clockwise, so the text reads from the top.
  const radius = 37;
  const ring = `M 50,50 m -${radius},0 a ${radius},${radius} 0 1,1 ${
    radius * 2
  },0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;
  return (
    <Svg width={size} height={size} viewBox='0 0 100 100'>
      <Defs>
        <Path id={ringId} d={ring} />
        <LinearGradient id={holoId} x1='0' y1='0' x2='1' y2='1'>
          <Stop offset='0' stopColor='#ffffff' />
          <Stop offset='0.45' stopColor='#e3d1ff' />
          <Stop offset='0.75' stopColor='#bfe6ff' />
          <Stop offset='1' stopColor='#f6c4ea' />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={50} r={48} fill='rgba(3,30,24,0.55)' stroke={MINT} strokeWidth={1.4} />
      <SvgText fill={MINT} fontSize={6.7} fontWeight='800' letterSpacing={0.35}>
        <TextPath href={`#${ringId}`} startOffset='0%'>
          {text}
        </TextPath>
      </SvgText>
      <Circle cx={50} cy={50} r={26} fill={MINT} stroke='#ffffff' strokeWidth={1.2} />
      <G transform='translate(26 25) scale(0.2)'>
        <Path d={AIRS_LEAF} fill={`url(#${holoId})`} stroke='#0b6b5a' strokeWidth={6} />
      </G>
    </Svg>
  );
}
