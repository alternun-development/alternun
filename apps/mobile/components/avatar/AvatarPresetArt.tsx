import React, { useId } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { AvatarPresetArtProps } from './avatar.types';

/** The illustrations people can choose as their avatar. */
export const AVATAR_PRESETS = [
  'mangrove',
  'leaf',
  'wave',
  'mountain',
  'sun',
  'coral',
  'hummingbird',
  'turtle',
] as const;

const RING = '#1de9b6';
const AIRS_LEAF =
  'm 83.902145,182.71792 c 0,0 -27.780611,-4.73633 -6.150891,-33.88575 l 70.876386,-79.5734 c 9.89575,-10.143488 30.4878,-9.472689 31.84836,3.353989 l 1.3895,70.405821 c 0.53291,27.0023 5.90897,40.76527 -10.8054,40.59374 z';

export function isAvatarPreset(value: string | null | undefined): boolean {
  return (AVATAR_PRESETS as readonly string[]).includes(value ?? '');
}

/** One of the avatar illustrations (mangrove, leaf, wave, ...) drawn as vectors. */
export default function AvatarPresetArt({ preset, size }: AvatarPresetArtProps): React.JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `avatar-bg-${uid}`;
  const clip = `avatar-clip-${uid}`;
  const accent = `avatar-accent-${uid}`;

  const scene = ((): React.JSX.Element => {
    switch (preset) {
      case 'leaf':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='1' y2='1'>
                <Stop offset='0' stopColor='#1de9b6' />
                <Stop offset='1' stopColor='#0b6b5a' />
              </LinearGradient>
              <LinearGradient id={accent} x1='0' y1='0' x2='1' y2='1'>
                <Stop offset='0' stopColor='#ffffff' />
                <Stop offset='0.5' stopColor='#e3d1ff' />
                <Stop offset='1' stopColor='#bfe6ff' />
              </LinearGradient>
            </Defs>
            <Circle cx={50} cy={50} r={48} fill={`url(#${bg})`} />
            <G transform='translate(-17 -20) scale(0.56)'>
              <Path d={AIRS_LEAF} fill={`url(#${accent})`} stroke='#04231c' strokeWidth={5} />
            </G>
          </G>
        );
      case 'wave':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor='#bfe6ff' />
                <Stop offset='1' stopColor='#2a9fd6' />
              </LinearGradient>
            </Defs>
            <G clipPath={`url(#${clip})`}>
              <Rect width={100} height={100} fill={`url(#${bg})`} />
              <Path
                d='M0 52 C 18 30, 38 30, 48 46 C 56 58, 70 56, 74 46 C 66 50, 58 44, 62 36 C 70 24, 92 32, 100 44 L100 100 L0 100 Z'
                fill='#1f7fb8'
              />
              <Path
                d='M0 66 C 20 56, 34 70, 50 64 C 66 58, 80 70, 100 62 L100 100 L0 100 Z'
                fill='#165f96'
              />
              <Path
                d='M0 80 C 22 72, 40 86, 58 78 C 74 72, 88 82, 100 78 L100 100 L0 100 Z'
                fill='#0f4874'
              />
              <Path
                d='M48 46 C 54 54, 64 54, 70 47'
                stroke='#ffffff'
                strokeWidth={2}
                fill='none'
                strokeLinecap='round'
              />
            </G>
          </G>
        );
      case 'mountain':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor='#ff9a6b' />
                <Stop offset='0.55' stopColor='#ffd3a8' />
              </LinearGradient>
            </Defs>
            <G clipPath={`url(#${clip})`}>
              <Rect width={100} height={100} fill={`url(#${bg})`} />
              <Circle cx={50} cy={40} r={12} fill='#fff1d6' />
              <Path
                d='M-4 78 L26 42 L40 58 L56 30 L80 60 L104 46 L104 100 L-4 100 Z'
                fill='#5b6f8c'
              />
              <Path d='M56 30 L64 40 L60 42 L56 38 L52 43 L48 40 Z' fill='#ffffff' />
              <Path d='M26 42 L32 49 L28 50 L25 47 L21 49 Z' fill='#ffffff' />
              <Path d='M-4 86 L22 66 L44 80 L70 62 L104 82 L104 100 L-4 100 Z' fill='#2f8f4e' />
            </G>
          </G>
        );
      case 'sun':
        return (
          <G>
            <Defs>
              <RadialGradient id={bg} cx='0.5' cy='0.5' r='0.6'>
                <Stop offset='0' stopColor='#ffe9a3' />
                <Stop offset='1' stopColor='#ff9a3c' />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={48} fill={`url(#${bg})`} />
            <G stroke='#fff7d6' strokeWidth={4} strokeLinecap='round'>
              <Line x1={50} y1={12} x2={50} y2={22} />
              <Line x1={50} y1={78} x2={50} y2={88} />
              <Line x1={12} y1={50} x2={22} y2={50} />
              <Line x1={78} y1={50} x2={88} y2={50} />
              <Line x1={23} y1={23} x2={30} y2={30} />
              <Line x1={70} y1={70} x2={77} y2={77} />
              <Line x1={77} y1={23} x2={70} y2={30} />
              <Line x1={30} y1={70} x2={23} y2={77} />
            </G>
            <Circle cx={50} cy={50} r={18} fill='#ffd84d' stroke='#fff7d6' strokeWidth={3} />
          </G>
        );
      case 'coral':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor='#2a9fd6' />
                <Stop offset='1' stopColor='#0b3c66' />
              </LinearGradient>
            </Defs>
            <G clipPath={`url(#${clip})`}>
              <Rect width={100} height={100} fill={`url(#${bg})`} />
              <Circle cx={24} cy={26} r={2} fill='#bfefff' />
              <Circle cx={30} cy={18} r={1.4} fill='#bfefff' />
              <Circle cx={74} cy={22} r={2.2} fill='#bfefff' />
              <Path
                d='M50 92 L50 60 M50 70 L38 52 M38 52 L32 40 M38 52 L44 38 M50 64 L62 48 M62 48 L58 34 M62 48 L72 40 M50 78 L30 66 M30 66 L22 58 M50 80 L70 68 M70 68 L80 60'
                stroke='#ff7a8a'
                strokeWidth={5}
                strokeLinecap='round'
                fill='none'
              />
              <Path d='M0 90 Q50 80 100 90 L100 100 L0 100 Z' fill='#f2d49b' />
              <Path
                d='M80 82 Q78 70 84 62 M84 62 Q90 66 86 74'
                stroke='#ffb27f'
                strokeWidth={3}
                fill='none'
                strokeLinecap='round'
              />
            </G>
          </G>
        );
      case 'hummingbird':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='1' y2='1'>
                <Stop offset='0' stopColor='#c8f5e3' />
                <Stop offset='1' stopColor='#57c26f' />
              </LinearGradient>
              <LinearGradient id={accent} x1='0' y1='0' x2='1' y2='1'>
                <Stop offset='0' stopColor='#1de9b6' />
                <Stop offset='1' stopColor='#2b5fd8' />
              </LinearGradient>
            </Defs>
            <Circle cx={50} cy={50} r={48} fill={`url(#${bg})`} />
            <Path d='M22 74 Q30 60 44 66 Q36 76 22 74 Z' fill='#ff5f8f' />
            <Path d='M28 70 Q31 80 33 90' stroke='#2f6b3a' strokeWidth={2.5} fill='none' />
            <Path d='M44 62 Q46 50 58 44 Q70 40 74 50 Q70 60 56 62 Z' fill={`url(#${accent})`} />
            <Path d='M58 46 Q50 22 64 16 Q68 32 62 46 Z' fill='#1aa37a' />
            <Path d='M60 46 Q72 26 84 28 Q76 42 64 48 Z' fill='#0b6b5a' />
            <Circle cx={70} cy={47} r={2} fill='#04231c' />
            <Path d='M74 49 L90 52' stroke='#04231c' strokeWidth={1.6} strokeLinecap='round' />
            <Path d='M44 62 L34 70 L40 62 Z' fill='#2b5fd8' />
          </G>
        );
      case 'turtle':
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor='#5fd0f0' />
                <Stop offset='1' stopColor='#1f7fb8' />
              </LinearGradient>
            </Defs>
            <Circle cx={50} cy={50} r={48} fill={`url(#${bg})`} />
            <Ellipse cx={30} cy={40} rx={11} ry={5} fill='#3aa45a' transform='rotate(-35 30 40)' />
            <Ellipse cx={70} cy={40} rx={11} ry={5} fill='#3aa45a' transform='rotate(35 70 40)' />
            <Ellipse cx={34} cy={70} rx={9} ry={4} fill='#3aa45a' transform='rotate(30 34 70)' />
            <Ellipse cx={66} cy={70} rx={9} ry={4} fill='#3aa45a' transform='rotate(-30 66 70)' />
            <Ellipse cx={50} cy={26} rx={7} ry={8} fill='#57c26f' />
            <Circle cx={47} cy={24} r={1.4} fill='#04231c' />
            <Circle cx={53} cy={24} r={1.4} fill='#04231c' />
            <Ellipse cx={50} cy={54} rx={19} ry={23} fill='#8a5a32' />
            <Ellipse cx={50} cy={54} rx={15} ry={19} fill='#b8793f' />
            <Path
              d='M50 37 L58 45 L58 59 L50 67 L42 59 L42 45 Z'
              fill='#d79a52'
              stroke='#8a5a32'
              strokeWidth={1.6}
            />
            <Path
              d='M42 45 L36 42 M58 45 L64 42 M42 59 L36 63 M58 59 L64 63 M50 37 L50 32 M50 67 L50 73'
              stroke='#8a5a32'
              strokeWidth={1.6}
            />
          </G>
        );
      default:
        return (
          <G>
            <Defs>
              <LinearGradient id={bg} x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor='#1b9fd8' />
                <Stop offset='0.62' stopColor='#9ee6d6' />
              </LinearGradient>
            </Defs>
            <G clipPath={`url(#${clip})`}>
              <Rect width={100} height={100} fill={`url(#${bg})`} />
              <Circle cx={70} cy={30} r={9} fill='#fff4c2' />
              <Rect y={66} width={100} height={34} fill='#1f8fbf' />
              <Path
                d='M0 70 Q12 67 25 70 T50 70 T75 70 T100 70'
                stroke='#bfefff'
                strokeWidth={1.6}
                fill='none'
              />
              <Path
                d='M30 68 Q34 54 38 68 M36 68 Q41 52 46 68 M44 68 Q50 50 56 68 M54 68 Q59 52 64 68 M62 68 Q66 54 70 68'
                stroke='#3b2a1e'
                strokeWidth={2.2}
                fill='none'
                strokeLinecap='round'
              />
              <Circle cx={38} cy={44} r={13} fill='#2f8f4e' />
              <Circle cx={52} cy={38} r={15} fill='#2f8f4e' />
              <Circle cx={64} cy={45} r={12} fill='#2f8f4e' />
              <Circle cx={46} cy={36} r={7} fill='#57c26f' />
              <Circle cx={60} cy={40} r={6} fill='#57c26f' />
              <Circle cx={50} cy={50} r={10} fill='#267a42' />
            </G>
          </G>
        );
    }
  })();

  return (
    <Svg width={size} height={size} viewBox='0 0 100 100'>
      <Defs>
        <ClipPath id={clip}>
          <Circle cx={50} cy={50} r={48} />
        </ClipPath>
      </Defs>
      {scene}
      <Circle
        cx={50}
        cy={50}
        r={47}
        fill='none'
        stroke={preset === 'leaf' ? 'rgba(255,255,255,0.6)' : RING}
        strokeWidth={preset === 'leaf' ? 2 : 2.5}
      />
    </Svg>
  );
}
