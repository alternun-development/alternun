import React from 'react';
import { Image, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { HONOR_TIER_PALETTES } from './honorAwardTheme';
import HonorAwardCrest, { isHonorArtPreset } from './HonorAwardCrest';
import { presetBadge } from './honorAwardArt';
import type { HonorAwardEmblemProps } from './honorAwards.types';

const SHIELD = 'M50 6 L90 20 L90 58 C90 83 72 99 50 108 C28 99 10 83 10 58 L10 20 Z';
const CUP = 'M28 18 H72 V40 C72 56 62 66 50 66 C38 66 28 56 28 40 Z';

function Laurel({ side, color }: { side: 'left' | 'right'; color: string }): React.JSX.Element {
  const leaves = [0, 1, 2, 3, 4];
  const flip = side === 'left' ? 1 : -1;
  const baseX = side === 'left' ? 14 : 86;
  return (
    <G>
      {leaves.map((index) => (
        <Ellipse
          key={index}
          cx={baseX + flip * index * 1.6}
          cy={88 - index * 12}
          rx={4.2}
          ry={8}
          fill={color}
          opacity={0.92}
          transform={`rotate(${flip * (-30 + index * 6)} ${baseX + flip * index * 1.6} ${
            88 - index * 12
          })`}
        />
      ))}
    </G>
  );
}

/**
 * The medal or trophy art. Recipes with their own art show it; the rest get a vector
 * placeholder in the colors of their tier so the collection always looks complete.
 */
export default function HonorAwardEmblem({
  tier,
  kind = 'medal',
  title,
  imageUrl,
  size,
  placeholder = false,
  artPreset,
}: HonorAwardEmblemProps): React.JSX.Element {
  const palette = HONOR_TIER_PALETTES[tier];
  const height = size * 1.12;

  if (imageUrl && !placeholder) {
    return (
      <View style={{ width: size, height }}>
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: imageUrl }}
          style={{ width: size, height }}
          resizeMode='contain'
        />
      </View>
    );
  }

  // The medal of the design file for this preset and tier, when the app bundles it.
  const bundled = placeholder ? null : presetBadge(artPreset, tier);
  if (bundled) {
    return (
      <View style={{ width: size, height }}>
        <Image
          accessibilityIgnoresInvertColors
          source={bundled}
          style={{ width: size, height }}
          resizeMode='contain'
        />
      </View>
    );
  }

  if (!placeholder && isHonorArtPreset(artPreset)) {
    return <HonorAwardCrest tier={tier} preset={artPreset ?? ''} title={title ?? ''} size={size} />;
  }

  const gradientId = `honor-shield-${tier}-${placeholder ? 'p' : 'a'}`;
  const label = (title ?? '').toUpperCase().slice(0, 16);

  if (placeholder) {
    return (
      <Svg width={size} height={height} viewBox='0 0 100 112'>
        <Path
          d={SHIELD}
          fill='rgba(29,191,156,0.06)'
          stroke='rgba(29,191,156,0.55)'
          strokeWidth={2.4}
        />
        <Circle cx={50} cy={56} r={17} fill='none' stroke='rgba(29,191,156,0.45)' strokeWidth={3} />
        <Circle cx={50} cy={56} r={7} fill='rgba(29,191,156,0.45)' />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={height} viewBox='0 0 100 112'>
      <Defs>
        <LinearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor={palette.shield[0]} />
          <Stop offset='1' stopColor={palette.shield[1]} />
        </LinearGradient>
        <LinearGradient id={`${gradientId}-sky`} x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor='#1aa3e8' />
          <Stop offset='1' stopColor='#9fe3c4' />
        </LinearGradient>
      </Defs>
      <Laurel side='left' color={palette.frame} />
      <Laurel side='right' color={palette.frame} />
      <Path d={SHIELD} fill={`url(#${gradientId})`} stroke={palette.frame} strokeWidth={3} />
      {kind === 'trophy' ? (
        <G>
          <Path d={CUP} fill={palette.shield[0]} stroke={palette.frame} strokeWidth={2.5} />
          <Rect x={45} y={66} width={10} height={10} fill={palette.frame} />
          <Rect x={36} y={76} width={28} height={6} rx={2} fill={palette.frame} />
        </G>
      ) : (
        <G>
          <Path
            d='M22 26 L78 26 L78 62 C78 66 74 70 70 70 L30 70 C26 70 22 66 22 62 Z'
            fill={`url(#${gradientId}-sky)`}
          />
          <Circle cx={60} cy={42} r={8} fill={palette.glow} opacity={0.95} />
          <Path d='M22 62 C34 48 46 54 56 50 C64 47 72 52 78 50 L78 70 L22 70 Z' fill='#3fa45b' />
          <Path d='M22 66 C38 58 58 62 78 58 L78 70 L22 70 Z' fill='#2f7d44' />
        </G>
      )}
      <Path
        d='M18 76 L82 76 L82 86 C82 96 66 104 50 108 C34 104 18 96 18 86 Z'
        fill={palette.banner}
      />
      {label ? (
        <SvgText
          x={50}
          y={92}
          fontSize={label.length > 10 ? 7 : 8.5}
          fontWeight='700'
          fill='#fff8e8'
          textAnchor='middle'
        >
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}
