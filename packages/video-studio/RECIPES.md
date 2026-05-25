# Video Studio Recipes

Ready-to-use patterns and code snippets for common tasks.

## Animation Recipes

### Fade In + Slide Up

```typescript
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export const FadeInSlideUp: React.FC = () => {
  const frame = useCurrentFrame();
  const START = 0;
  const DURATION = 30;

  const opacity = interpolate(frame, [START, START + DURATION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(frame, [START, START + DURATION], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return <div style={{ opacity, transform: `translateY(${translateY}px)` }}>Content</div>;
};
```

### Scale Pop

```typescript
const scale = interpolate(frame, [START, START + 20], [0.8, 1.0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic),
});

return <div style={{ transform: `scale(${scale})` }}>Content</div>;
```

### Smooth Scroll

```typescript
const scrollY = interpolate(frame, [0, 600], [0, 300], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.inOut(Easing.quad),
});

return <div style={{ transform: `translateY(${-scrollY}px)` }}>Long content</div>;
```

### Rotate + Fade

```typescript
const rotation = interpolate(frame, [START, START + 60], [0, 360], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.linear,
});

const opacity = interpolate(frame, [START, START + 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});

return (
  <div
    style={{
      opacity,
      transform: `rotate(${rotation}deg)`,
    }}
  >
    Loading spinner
  </div>
);
```

### Parallax Scroll

```typescript
const offset1 = interpolate(frame, [0, 300], [0, 100], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});

const offset2 = interpolate(frame, [0, 300], [0, 50], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});

return (
  <>
    <div style={{ transform: `translateY(${offset1}px)` }}>Fast-moving background</div>
    <div style={{ transform: `translateY(${offset2}px)` }}>Slow-moving foreground</div>
  </>
);
```

---

## Text Animations

### Typewriter Effect

```typescript
export const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame: number;
}> = ({ text, startFrame, charsPerFrame }) => {
  const frame = useCurrentFrame();
  const charIndex = Math.floor((frame - startFrame) * charsPerFrame);
  const displayText = text.slice(0, Math.max(charIndex, 0));

  return <div>{displayText}</div>;
};

// Usage
<TypewriterText text='AIRS by Alternun' startFrame={90} charsPerFrame={0.2} />;
```

### Staggered Word Reveal

```typescript
export const StaggeredWords: React.FC<{
  text: string;
  startFrame: number;
  delayPerWord: number;
}> = ({ text, startFrame, delayPerWord }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {words.map((word, idx) => {
        const wordStartFrame = startFrame + idx * delayPerWord;
        const opacity = interpolate(frame, [wordStartFrame, wordStartFrame + 15], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div key={idx} style={{ opacity }}>
            {word}
          </div>
        );
      })}
    </div>
  );
};

// Usage
<StaggeredWords text='The Future of Regenerative Finance' startFrame={150} delayPerWord={20} />;
```

### Blinking Cursor

```typescript
export const BlinkingCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = Math.floor((frame / 15) % 2) === 0 ? 1 : 0;

  return (
    <span
      style={{
        opacity,
        marginLeft: '4px',
        color: '#00d9ff',
        fontWeight: 'bold',
      }}
    >
      |
    </span>
  );
};
```

---

## Data Visualization Recipes

### Animated Bar Chart

```typescript
export const AnimatedBarChart: React.FC<{
  data: { label: string; value: number }[];
  startFrame: number;
  animationDuration: number;
}> = ({ data, startFrame, animationDuration }) => {
  const frame = useCurrentFrame();
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
      {data.map((item, idx) => {
        const barStartFrame = startFrame + idx * 10;
        const progress = interpolate(
          frame,
          [barStartFrame, barStartFrame + animationDuration],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        const height = (item.value / maxValue) * 200 * progress;

        return (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: `${height}px`,
                background: 'linear-gradient(180deg, #00d9ff, #0099cc)',
                borderRadius: '4px 4px 0 0',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '12px' }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
};
```

### Animated Line Chart (SVG)

```typescript
export const AnimatedLineChart: React.FC<{
  points: number[];
  startFrame: number;
}> = ({ points, startFrame }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, startFrame + 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const visiblePoints = Math.ceil(points.length * progress);
  const displayPoints = points.slice(0, visiblePoints);

  // Normalize to 0-100 range
  const maxPoint = Math.max(...displayPoints);
  const normalizedPoints = displayPoints.map((p) => 100 - (p / maxPoint) * 100);

  // Generate SVG path
  const pathData = normalizedPoints
    .map((y, x) => `${(x / (displayPoints.length - 1)) * 500},${y}`)
    .join(' L ');

  return (
    <svg viewBox='0 0 500 100' style={{ width: '100%' }}>
      <polyline points={pathData} fill='none' stroke='#00d9ff' strokeWidth='2' />
      <polyline points={pathData} fill='url(#gradient)' opacity='0.2' />
      <defs>
        <linearGradient id='gradient' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#00d9ff' stopOpacity='0.3' />
          <stop offset='100%' stopColor='#00d9ff' stopOpacity='0' />
        </linearGradient>
      </defs>
    </svg>
  );
};
```

### Counter Animation

```typescript
export const AnimatedCounter: React.FC<{
  from: number;
  to: number;
  startFrame: number;
  endFrame: number;
  format?: (n: number) => string;
}> = ({ from, to, startFrame, endFrame, format = (n) => n.toString() }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const current = Math.floor(from + (to - from) * progress);

  return <div>{format(current)}</div>;
};

// Usage
<AnimatedCounter
  from={0}
  to={2450000}
  startFrame={60}
  endFrame={120}
  format={(n) => `$${n.toLocaleString()}`}
/>;
```

---

## Interaction Recipes

### Cursor Movement

```typescript
export const CursorPath: React.FC<{
  points: [number, number][];
  startFrame: number;
  duration: number;
}> = ({ points, startFrame, duration }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Find current segment
  const totalDistance = points.length - 1;
  const segmentIndex = Math.floor(progress * totalDistance);
  const nextSegmentIndex = Math.min(segmentIndex + 1, points.length - 1);

  const segmentProgress = progress * totalDistance - segmentIndex;

  const [x1, y1] = points[segmentIndex];
  const [x2, y2] = points[nextSegmentIndex];

  const x = x1 + (x2 - x1) * easeInOutQuad(segmentProgress);
  const y = y1 + (y2 - y1) * easeInOutQuad(segmentProgress);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: '20px',
        height: '20px',
        pointerEvents: 'none',
      }}
    >
      {/* Cursor SVG */}
    </div>
  );
};

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
```

### Button Hover Effect

```typescript
export const InteractiveButton: React.FC<{
  label: string;
  hoverFrame?: number;
}> = ({ label, hoverFrame }) => {
  const frame = useCurrentFrame();

  const isHovering = hoverFrame !== undefined && frame >= hoverFrame;

  const scale = interpolate(frame, [hoverFrame || 0, (hoverFrame || 0) + 10], [1, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowOpacity = interpolate(frame, [hoverFrame || 0, (hoverFrame || 0) + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <button
      style={{
        padding: '12px 32px',
        background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transform: `scale(${scale})`,
        boxShadow: `0 0 20px rgba(0, 217, 255, ${glowOpacity})`,
      }}
    >
      {label}
    </button>
  );
};
```

---

## Gradient & Effect Recipes

### Animated Gradient

```typescript
export const AnimatedGradient: React.FC = () => {
  const frame = useCurrentFrame();

  const angle = (frame / 30) * 360; // Rotate 360° every second

  return (
    <div
      style={{
        background: `linear-gradient(${angle}deg, #00d9ff, #0099cc, #00d9ff)`,
        backgroundSize: '200% 200%',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
```

### Floating Particles

```typescript
export const FloatingParticles: React.FC<{
  count: number;
  baseY: number;
}> = ({ count, baseY }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {[...Array(count)].map((_, i) => {
        const randomX = Math.random() * 100;
        const randomSpeed = 3 + Math.random() * 2;
        const randomSize = 20 + Math.random() * 40;

        const y = baseY + Math.sin(frame / randomSpeed + i) * 20;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${randomX}%`,
              top: `${y}px`,
              width: `${randomSize}px`,
              height: `${randomSize}px`,
              background: `radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)`,
              borderRadius: '50%',
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
};
```

### Glassmorphism Card

```typescript
export const GlassmorphismCard: React.FC<{
  children: React.ReactNode;
  opacity?: number;
}> = ({ children, opacity = 0.1 }) => {
  return (
    <div
      style={{
        background: `rgba(0, 217, 255, ${opacity})`,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      {children}
    </div>
  );
};
```

---

## Scene Building Blocks

### Stat Card

```typescript
interface StatCard {
  label: string;
  value: string;
  change: string;
  startFrame: number;
}

export const StatCard: React.FC<StatCard> = ({ label, value, change, startFrame }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [startFrame, startFrame + 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(0, 153, 204, 0.05))',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '12px',
        padding: '24px',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#00d9ff' }}>{change}</div>
    </div>
  );
};
```

### Browser Frame

See [src/components/BrowserFrame.tsx](src/components/BrowserFrame.tsx) for full implementation.

### Section Title

```typescript
export const SectionTitle: React.FC<{
  text: string;
  startFrame: number;
}> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [startFrame, startFrame + 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <h2
      style={{
        fontSize: '56px',
        fontWeight: 700,
        color: '#ffffff',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {text}
    </h2>
  );
};
```

---

## Common Patterns

### Staggered List

```typescript
interface ListItem {
  id: string;
  title: string;
  subtitle: string;
}

export const StaggeredList: React.FC<{
  items: ListItem[];
  startFrame: number;
  itemDelay: number;
}> = ({ items, startFrame, itemDelay }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {items.map((item, idx) => {
        const itemStartFrame = startFrame + idx * itemDelay;

        const opacity = interpolate(frame, [itemStartFrame, itemStartFrame + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const translateX = interpolate(frame, [itemStartFrame, itemStartFrame + 20], [-30, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={item.id}
            style={{
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{item.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
};
```

### Scene Transition

```typescript
export const SceneTransition: React.FC<{
  fromFrame: number;
  toFrame: number;
  fromScene: React.ReactNode;
  toScene: React.ReactNode;
}> = ({ fromFrame, toFrame, fromScene, toScene }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [fromFrame, toFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ opacity: 1 - progress }}>{fromScene}</div>
      <div style={{ position: 'absolute', top: 0, opacity: progress }}>{toScene}</div>
    </div>
  );
};
```

---

## Helper Functions

### Easing Presets

```typescript
export const easings = {
  // Fade
  fadeIn: (frame: number, start: number, duration: number = 30) =>
    interpolate(frame, [start, start + duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),

  fadeOut: (frame: number, start: number, duration: number = 30) =>
    interpolate(frame, [start, start + duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    }),

  // Slide
  slideInUp: (frame: number, start: number, distance: number = 20, duration: number = 30) =>
    interpolate(frame, [start, start + duration], [distance, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),

  slideOutDown: (frame: number, start: number, distance: number = 20, duration: number = 30) =>
    interpolate(frame, [start, start + duration], [0, distance], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    }),

  // Scale
  scaleIn: (frame: number, start: number, duration: number = 20) =>
    interpolate(frame, [start, start + duration], [0.8, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),
};

// Usage
const opacity = easings.fadeIn(frame, 100, 30);
const translateY = easings.slideInUp(frame, 100, 20, 30);
const scale = easings.scaleIn(frame, 100, 20);
```

---

## Testing Snippets

### Frame Counter Overlay

```typescript
export const FrameDebugger: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = (frame / fps).toFixed(2);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
      }}
    >
      Frame: {frame} | {seconds}s
    </div>
  );
};
```

### Add to any scene to debug timing

---

Enjoy building! 🎬✨
