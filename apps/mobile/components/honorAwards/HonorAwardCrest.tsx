import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { HonorAwardTier } from '../../utils/honorAwards';
import type { HonorAwardCrestProps, HonorCrestPalette } from './honorAwards.types';

/** Built-in art presets a recipe can name in `artPreset`. */
export const HONOR_ART_PRESETS = ['golf_mangrove', 'coast'] as const;

export function isHonorArtPreset(value: string | null | undefined): boolean {
  return (HONOR_ART_PRESETS as readonly string[]).includes(value ?? '');
}

/** Metal and enamel colors of each tier, taken from the "Galardones de honor" medal designs. */
export const HONOR_CREST_PALETTES: Record<HonorAwardTier, HonorCrestPalette> = {
  generic: {
    frame: '#7d6450',
    frameLight: '#d8c4ae',
    banner: '#b59c86',
    bannerText: '#3a2a22',
    leafAccent: '#7fc96a',
    leafStroke: '#2f6b3a',
    sun: '#fff1b8',
    outfit: '#3a9a5c',
    trousers: '#2f6f4a',
  },
  gold: {
    frame: '#d4a72c',
    frameLight: '#ffe7a0',
    banner: '#e0a33a',
    bannerText: '#4a2a08',
    leafAccent: '#f2c14e',
    leafStroke: '#a8781f',
    sun: '#ffd84d',
    outfit: '#3a9a5c',
    trousers: '#2f6f4a',
  },
  silver: {
    frame: '#a9b8bd',
    frameLight: '#f4f8f9',
    banner: '#4f5b66',
    bannerText: '#eef3f5',
    leafAccent: '#d7e0e3',
    leafStroke: '#7d8a92',
    sun: '#f7fbfc',
    outfit: '#3a9a5c',
    trousers: '#2f6f4a',
  },
  bronze: {
    frame: '#c86f3c',
    frameLight: '#ffc9a1',
    banner: '#9b4a26',
    bannerText: '#ffe1c8',
    leafAccent: '#e0915c',
    leafStroke: '#8a4426',
    sun: '#ffd7b0',
    outfit: '#c97a45',
    trousers: '#9b5530',
  },
};

const CREST = 'M28 18 Q60 4 92 18 L106 36 L106 72 Q106 106 60 126 Q14 106 14 72 L14 36 Z';
const WINDOW = 'M31 23 Q60 11 89 23 L100 38 L100 72 Q100 101 60 119 Q20 101 20 72 L20 38 Z';
const BANNER = 'M20 96 L100 96 L99.5 101 Q97 110 60 122 Q23 110 20.5 101 Z';

const LEFT_LEAVES: ReadonlyArray<[number, number, number]> = [
  [13, 108, -38],
  [8, 96, -22],
  [6, 84, -10],
  [6, 72, 4],
  [9, 60, 18],
];

/** Splits the title in two balanced lines for the banner. */
export function bannerLines(title: string): [string, string] {
  const words = title.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] ?? '', ''];
  let best: [string, string] = [words.join(' '), ''];
  let bestGap = Number.POSITIVE_INFINITY;
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(' ');
    const second = words.slice(split).join(' ');
    const gap = Math.abs(first.length - second.length);
    if (gap < bestGap) {
      best = [first, second];
      bestGap = gap;
    }
  }
  return best;
}

function Laurels({ palette }: { palette: HonorCrestPalette }): React.JSX.Element {
  const leaves = LEFT_LEAVES.flatMap(([cx, cy, angle], index) => [
    { key: `l${index}`, cx, cy, angle, accent: index % 2 === 1 },
    { key: `r${index}`, cx: 120 - cx, cy, angle: -angle, accent: index % 2 === 1 },
  ]);
  return (
    <G>
      <Path d='M24 122 Q3 98 10 56' stroke={palette.leafStroke} strokeWidth={1.6} fill='none' />
      <Path d='M96 122 Q117 98 110 56' stroke={palette.leafStroke} strokeWidth={1.6} fill='none' />
      {leaves.map((leaf) => (
        <Ellipse
          key={leaf.key}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={4.8}
          ry={9}
          fill={leaf.accent ? palette.leafAccent : '#5bb85a'}
          stroke={palette.leafStroke}
          strokeWidth={0.8}
          transform={`rotate(${leaf.angle} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
    </G>
  );
}

function Golfer({ palette }: { palette: HonorCrestPalette }): React.JSX.Element {
  // Follow-through pose, scaled up around the feet so the player reads well at small sizes.
  return (
    <G transform='translate(60 98) scale(1.22) translate(-60 -98)'>
      <Polyline
        points='58,84 55,91 53,98'
        stroke={palette.trousers}
        strokeWidth={3.8}
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
      <Polyline
        points='61,84 65,91 66,98'
        stroke={palette.trousers}
        strokeWidth={3.8}
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
      <Line
        x1={60}
        y1={84}
        x2={62}
        y2={71}
        stroke={palette.outfit}
        strokeWidth={6}
        strokeLinecap='round'
      />
      <Polyline
        points='62,72 58,66 55,60'
        stroke={palette.outfit}
        strokeWidth={3}
        strokeLinecap='round'
        strokeLinejoin='round'
        fill='none'
      />
      <Line
        x1={55}
        y1={60}
        x2={74}
        y2={53}
        stroke='#2d2d2d'
        strokeWidth={1.2}
        strokeLinecap='round'
      />
      <Line
        x1={74}
        y1={53}
        x2={76.5}
        y2={55.5}
        stroke='#2d2d2d'
        strokeWidth={1.8}
        strokeLinecap='round'
      />
      <Circle cx={64} cy={66.5} r={3.8} fill='#e8b98f' />
      <Path d='M60.2 65.6 Q64 61 67.8 65.6 Z' fill={palette.outfit} />
    </G>
  );
}

function GolfMangroveScene({
  palette,
  skyId,
}: {
  palette: HonorCrestPalette;
  skyId: string;
}): React.JSX.Element {
  return (
    <G>
      <Rect x={0} y={0} width={120} height={132} fill={`url(#${skyId})`} />
      <Circle cx={74} cy={44} r={11} fill={palette.sun} opacity={0.95} />
      <Ellipse cx={42} cy={36} rx={8} ry={3} fill='#ffffff' opacity={0.7} />
      <Ellipse cx={90} cy={32} rx={6} ry={2.4} fill='#ffffff' opacity={0.6} />
      <Path d='M20 64 Q38 50 56 60 Q72 48 100 58 L100 132 L20 132 Z' fill='#8fd3b0' />
      <Path d='M20 72 Q44 62 64 70 Q82 62 100 68 L100 132 L20 132 Z' fill='#5fbf8f' />
      <Circle cx={28} cy={62} r={10} fill='#2f8f4e' />
      <Circle cx={38} cy={56} r={8} fill='#2f8f4e' />
      <Circle cx={23} cy={53} r={7} fill='#3aa45a' />
      <Circle cx={31} cy={57} r={4} fill='#57c26f' />
      <Circle cx={92} cy={58} r={10} fill='#2f8f4e' />
      <Circle cx={84} cy={52} r={7} fill='#3aa45a' />
      <Circle cx={98} cy={66} r={8} fill='#2f8f4e' />
      <Circle cx={89} cy={54} r={4} fill='#57c26f' />
      <Path
        d='M22 74 Q26 66 30 74 M28 75 Q32 66 36 75 M34 75 Q37 68 40 75 M82 72 Q86 64 90 72 M88 73 Q92 64 96 73 M94 73 Q97 66 100 73'
        stroke='#245f34'
        strokeWidth={1.4}
        fill='none'
      />
      <Path d='M20 86 Q60 76 100 84 L100 132 L20 132 Z' fill='#6cc04a' />
      <Path d='M20 94 Q60 86 100 92 L100 132 L20 132 Z' fill='#4fa53a' />
      <Golfer palette={palette} />
      <Ellipse cx={30} cy={94} rx={6} ry={2.6} fill='#3d9a4f' transform='rotate(-20 30 94)' />
      <Ellipse cx={90} cy={93} rx={6} ry={2.6} fill='#3d9a4f' transform='rotate(20 90 93)' />
    </G>
  );
}

function CoastScene({
  palette,
  skyId,
}: {
  palette: HonorCrestPalette;
  skyId: string;
}): React.JSX.Element {
  return (
    <G>
      <Rect x={0} y={0} width={120} height={132} fill={`url(#${skyId})`} />
      <Circle cx={46} cy={46} r={10} fill={palette.sun} opacity={0.95} />
      <Path
        d='M20 70 L36 52 L46 62 L60 46 L74 62 L86 54 L100 66 L100 132 L20 132 Z'
        fill='#6fae94'
      />
      <Path d='M56 50 L60 46 L64 50 L62 51 L60 49 L58 51 Z' fill='#ffffff' opacity={0.85} />
      <Rect x={0} y={72} width={120} height={16} fill='#2a9fd6' />
      <Path
        d='M24 78 Q28 76 32 78 Q36 80 40 78 M50 82 Q54 80 58 82 Q62 84 66 82 M78 77 Q82 75 86 77'
        stroke='#ffffff'
        strokeWidth={1.1}
        fill='none'
        opacity={0.85}
      />
      <Path d='M20 88 Q60 80 100 88 L100 132 L20 132 Z' fill='#f2d49b' />
      <Path
        d='M76 98 Q73 84 80 70'
        stroke='#8a5a32'
        strokeWidth={2.6}
        fill='none'
        strokeLinecap='round'
      />
      <Path
        d='M80 70 Q70 64 64 70 M80 70 Q88 62 96 66 M80 70 Q78 60 71 58 M80 70 Q90 70 94 77'
        stroke='#2f8f4e'
        strokeWidth={2.4}
        fill='none'
        strokeLinecap='round'
      />
      <Circle cx={40} cy={96} r={2.2} fill={palette.frame} opacity={0.8} />
    </G>
  );
}

/**
 * The final medal art: a heraldic crest in the tier metal with laurels and the mission name on
 * the banner, drawn as vectors so it stays sharp in the collection, the claim and the card.
 */
export default function HonorAwardCrest({
  tier,
  preset,
  title,
  size,
}: HonorAwardCrestProps): React.JSX.Element {
  const palette = HONOR_CREST_PALETTES[tier];
  const skyId = `honor-crest-sky-${preset}`;
  const clipId = 'honor-crest-window';
  const [line1, line2] = bannerLines(title);
  const longest = Math.max(line1.length, line2.length);
  const fontSize = longest > 12 ? 5.6 : longest > 9 ? 6.6 : 7.6;
  return (
    <Svg width={size} height={size * 1.1} viewBox='0 0 120 132'>
      <Defs>
        <LinearGradient id={skyId} x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor='#168fdc' />
          <Stop offset='0.55' stopColor='#8fdcf0' />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Path d={WINDOW} />
        </ClipPath>
      </Defs>
      <Path d={CREST} fill={palette.frame} />
      <G clipPath={`url(#${clipId})`}>
        {preset === 'coast' ? (
          <CoastScene palette={palette} skyId={skyId} />
        ) : (
          <GolfMangroveScene palette={palette} skyId={skyId} />
        )}
      </G>
      <Path d={WINDOW} fill='none' stroke={palette.frameLight} strokeWidth={1} opacity={0.7} />
      <Path d={CREST} fill='none' stroke={palette.frame} strokeWidth={3} />
      <Laurels palette={palette} />
      <Path d={BANNER} fill={palette.banner} stroke={palette.frame} strokeWidth={1.4} />
      <SvgText
        x={60}
        y={line2 ? 105.5 : 109}
        fontSize={fontSize}
        fontWeight='800'
        letterSpacing={0.4}
        fill={palette.bannerText}
        textAnchor='middle'
      >
        {line1}
      </SvgText>
      {line2 ? (
        <SvgText
          x={60}
          y={113.5}
          fontSize={fontSize}
          fontWeight='800'
          letterSpacing={0.4}
          fill={palette.bannerText}
          textAnchor='middle'
        >
          {line2}
        </SvgText>
      ) : null}
    </Svg>
  );
}
