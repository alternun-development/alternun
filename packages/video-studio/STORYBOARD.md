# AIRS Demo Video - Storyboard

**Title:** AIRS by Alternun: Regenerative Finance Infrastructure  
**Duration:** 3 minutes (2:40 recommended, 3:00 maximum)  
**Format:** 1440p (1440x810) @ 30fps  
**Style:** Apple/Stripe/Vercel SaaS launch aesthetic

---

## Scene 1: Intro (0:00 - 0:15) — 450 frames

### Visual Direction

**Fade in from black.** 10-15% fade (0-90 frames), then hold at 100% opacity.

**Background:** Animated gradient with subtle rotating glow orb.

```
Linear gradient: #0f0f0f (top) → #16213e (bottom)
Radial highlight: cyan glow at center, 50% opacity
Slowly rotating around viewport (360° over 30 seconds)
```

### Typography Sequence

| Frame Range | Element        | Animation                   | Details                               |
| ----------- | -------------- | --------------------------- | ------------------------------------- |
| 0-90        | Logo "AIRS"    | Fade in + scale 1.2→1       | 120px, #00d9ff, text-shadow glow      |
| 90-180      | "by Alternun"  | Fade in + translateY 20px→0 | 48px, #ffffff, 200ms delay            |
| 150-240     | Subtitle       | Fade in                     | "Regenerative Finance Infrastructure" |
| 300-450     | Transition out | Fade to black               | 150-frame black transition            |

### Key Frame Values

```typescript
logoOpacity: interpolate(frame, [0, 90], [0, 1], easeOutCubic);
titleOpacity: interpolate(frame, [90, 180], [0, 1], easeOutCubic);
subtitleOpacity: interpolate(frame, [150, 240], [0, 1], easeOutCubic);
exitBlack: interpolate(frame, [300, 450], [0, 1], easeInCubic);
```

### Audio

**Duration:** 15 seconds of ambient electronic intro.  
**BPM:** 90-100  
**Mood:** Ethereal, aspirational, tech-forward

---

## Scene 2: Login (0:15 - 0:35) — 600 frames

### Visual Direction

**Browser window opens.** Zoom from 1.2 scale at center to full 1.0 scale.

**Content:** Landing page with wallet connection UI.

### Browser Frame

```
macOS-style window:
- Traffic lights (red, yellow, green)
- URL bar: testnet.airs.alternun.co
- Rounded corners (12px)
- Drop shadow: 0 20px 60px rgba(0,0,0,0.4)
```

### Content Animation

| Frame   | Action              | Details                                    |
| ------- | ------------------- | ------------------------------------------ |
| 0-60    | Page fade in        | Browser chrome & URL bar visible           |
| 60-200  | Content reveal      | Logo, buttons, copy                        |
| 150-300 | Cursor movement     | Animated cursor to "Connect Wallet" button |
| 300-400 | Button hover state  | Subtle glow, scale 1.05                    |
| 400-600 | Zoom out transition | Scale 1.0 → 0.95                           |

### Key Copy

```
Heading: "AIRS"
Subtitle: "Gold-backed digital assets. Regenerative finance."
CTA Buttons:
  - "Connect Wallet" (primary, cyan gradient)
  - "Sign Up" (secondary, outline style)
```

### CSS Details

**Buttons:**

```css
Primary: linear-gradient(135deg, #00d9ff, #0099cc)
Secondary: transparent with 1px #00d9ff border
Padding: 12px 32px
Border-radius: 8px
Font-weight: 600
```

---

## Scene 3: Dashboard (0:35 - 1:10) — 1050 frames

### Visual Direction

**Full-featured product showcase.** Hero dashboard with portfolio metrics, charts, and interactive elements.

### Header Section

| Frame | Animation | Details                             |
| ----- | --------- | ----------------------------------- |
| 0-30  | Fade in   | "Portfolio Overview" title          |
| 0-30  | Fade in   | Status badge: "Connected • Mainnet" |

### Stat Cards (Staggered Reveal)

| Stat             | Delay | Value       | Format               |
| ---------------- | ----- | ----------- | -------------------- |
| Total Assets     | 30    | $2,450,000  | Large green +12.5%   |
| Gold Reserve     | 60    | 45,200 oz   | Large green +8.3%    |
| Staking Rewards  | 90    | $48,500     | Large cyan +24.2%    |
| Ecosystem Impact | 120   | 2,400 trees | Large green +340 new |

**Card Animation:**

```typescript
opacity: interpolate(frame, [delay, delay + 30], [0, 1], easeOutCubic);
transform: `translateY(${interpolate(frame, [delay, delay + 30], [20, 0])}px)`;
```

### Chart Area

**Asset Growth (Last 30 Days)**

- SVG line chart with area fill
- 5-point smooth spline: (0,120) → (50,90) → (100,70) → ... → (500,15)
- Animated gradient fill underneath
- Grid lines at 20-unit intervals

```svg
<polyline points="0,120 50,90 100,70 150,80 200,50 250,40 300,55 350,35 400,45 450,20 500,15"
  stroke="#00d9ff" stroke-width="2" fill="none" />
<polyline points="0,120 50,90 100,70 150,80 200,50 250,40 300,55 350,35 400,45 450,20 500,15"
  fill="url(#gradient)" opacity="0.2" />
```

### Cursor Interactions

- Hover over stat cards (2-3 hoverings)
- Hover over chart area
- No clicks, just navigation visualization

### Duration Breakdown

- Intro fade: 60 frames
- Card stagger reveals: 120 frames total
- Chart reveal: 250 frames
- Hovering/exploration: 400 frames
- Transition out: 220 frames

---

## Scene 4: Interactions (1:10 - 1:50) — 1200 frames

### Visual Direction

**Deep product dive.** Transaction list, tab navigation, multiple interaction patterns.

### Header

| Frame | Element | Action                            |
| ----- | ------- | --------------------------------- |
| 0-40  | Title   | Fade in: "Transactions & Staking" |
| 0-40  | Content | Fade in browser frame             |

### Tab Navigation

Four tabs, left-aligned:

- **Transactions** (active, underline #00d9ff)
- **Staking** (inactive, hover state)
- **Governance** (inactive)
- **Yield** (inactive)

**Cursor movement:**

```
Timeline 60-600 frames:
  - Hover Transactions (already active)
  - Hover Staking (300 frame delay)
  - Hover Governance (500 frame delay)
  - Return to Transactions (700 frame delay)
```

### Transaction List

**Four transactions, staggered reveals:**

| Type            | Amount      | Status      | Time        | Frame Delay |
| --------------- | ----------- | ----------- | ----------- | ----------- |
| Deposit         | 50,000 USDC | ✓ Confirmed | 2 hours ago | 60          |
| Stake Gold      | 2,500 oz    | ✓ Confirmed | 4 hours ago | 100         |
| Claim Rewards   | 1,245 USDC  | ✓ Confirmed | 1 day ago   | 140         |
| Ecosystem Grant | 500 Trees   | ⏳ Pending  | In Progress | 180         |

**Item animation:**

```typescript
opacity: interpolate(frame, [delay, delay + 30], [0, 1]);
transform: `translateX(${interpolate(frame, [delay, delay + 30], [-30, 0])}px)`;
```

### Action Buttons

- "Deposit Now" (primary, full-width)
- "View History" (secondary outline)
- Appears at 250 frame mark with scale-up animation

### Duration Breakdown

- Tab hover animations: 300-700 frames
- Transaction reveals: 60-180 frames
- Button appearance: 250-300 frames
- Transition: 900-1200 frames

---

## Scene 5: Impact (1:50 - 2:20) — 900 frames

### Visual Direction

**Regenerative finance positioning.** Full-screen immersive scene with sustainability focus.

### Background

**Gradient:** Green tinted, animated particles

```css
background: linear-gradient(135deg, #0a3d2e 0%, #0f1f2e 100%);
```

**Floating particles (5 orbs):**

- Radial gradient: cyan glow, opacity 0.3
- Float animation: 5-9 second duration, ease-in-out
- Stagger starts by 200-400ms

```css
@keyframes float {
  0%, 100%: translateY(0) translateX(0)
  25%: translateY(-20px) translateX(10px)
  50%: translateY(-40px) translateX(0)
  75%: translateY(-20px) translateX(-10px)
}
```

### Title & Subtitle

| Frame  | Text                   | Size       | Animation            |
| ------ | ---------------------- | ---------- | -------------------- |
| 0-60   | "Regenerative Finance" | 56px bold  | Fade in + translateY |
| 40-120 | Long subtitle          | 24px light | Fade in              |

### Metrics (3-Column Grid)

| Metric        | Value       | Frame Reveal |
| ------------- | ----------- | ------------ |
| Gold Verified | 125,000 oz  | 100-140      |
| Trees Planted | 34,500      | 140-180      |
| CO₂ Offset    | 12,450 tons | 180-220      |

**Animation per card:**

```typescript
opacity: interpolate(frame, [delay, delay + 40], [0, 1], easeOutCubic);
transform: `scale(${interpolate(frame, [delay, delay + 40], [0.8, 1])})`;
```

### Feature Bullets (Appear at 300 frame mark)

Three items with checkmarks:

1. Blockchain Verified Gold
2. Decentralized Governance
3. Impact Tracking

**Background:** Semi-transparent cyan boxes with 1px border

**Animation:**

```typescript
opacity: interpolate(frame, [300, 360], [0, 1]);
```

---

## Scene 6: Responsive (2:20 - 2:40) — 600 frames

### Visual Direction

**Side-by-side device comparison.** Showcase responsive design across form factors.

### Layout

**Two device frames, centered, 40px gap:**

| Position | Device  | Dimensions | Content        |
| -------- | ------- | ---------- | -------------- |
| Left     | Desktop | 320x240px  | Dashboard view |
| Right    | Mobile  | 140x240px  | Dashboard view |

### Device Frame Styling

**Desktop:**

- Border-radius: 12px
- Border: 1px solid #333
- Box-shadow: 0 20px 60px rgba(0,217,255,0.2)

**Mobile (iPhone):**

- Border-radius: 32px
- Border: 8px solid #222
- Notch: 24px height, 16px border-radius bottom
- Box-shadow: same as desktop

### Animations

| Device  | Start | End | Duration   | Effect             |
| ------- | ----- | --- | ---------- | ------------------ |
| Desktop | 0     | 40  | Fade in    | opacity 0→1        |
| Desktop | 40    | 120 | Pan left   | translateX 0→-30px |
| Desktop | 200   | 280 | Scale down | scale 1→0.8        |
| Mobile  | 60    | 100 | Fade in    | opacity 0→1        |
| Mobile  | 100   | 180 | Pan right  | translateX 0→30px  |
| Mobile  | 200   | 280 | Scale down | scale 1→0.8        |

### Labels

Below each device:

- Device name (14px, white)
- "Responsive Design" (12px, gray)

---

## Scene 7: Outro (2:40 - 3:00) — 600 frames

### Visual Direction

**Return to hero, ultimate CTA.** Elegant fade-out with calls-to-action.

### Background

**Dark gradient:**

```css
background: linear-gradient(135deg, #0f0f1e 0%, #0a0a15 100%);
```

### Logo Return

| Frame | Animation       | Details                     |
| ----- | --------------- | --------------------------- |
| 0-60  | Fade in + scale | 120px "AIRS", #00d9ff, glow |

### Heading

| Frame   | Text                                 | Size       | Animation            |
| ------- | ------------------------------------ | ---------- | -------------------- |
| 60-140  | "Built by Alternun"                  | 44px bold  | Fade in + translateY |
| 100-180 | "The Future of Regenerative Finance" | 24px light | Fade in              |

### CTA Button

| Frame   | State       | Details                       |
| ------- | ----------- | ----------------------------- |
| 150-230 | Appear      | Fade in + scale 0.9→1         |
| 150-600 | Hover ready | Ready for click in live demos |

**Button:** "Join the Revolution"  
**Style:** Cyan gradient, 16px 40px padding

### URL

| Frame   | Content                  | Details                  |
| ------- | ------------------------ | ------------------------ |
| 180-260 | testnet.airs.alternun.co | 16px, #00d9ff, monospace |

### Fade to Black

| Frame   | Opacity | Effect            |
| ------- | ------- | ----------------- |
| 450-600 | 0 → 1   | Black screen fade |

---

## Technical Animation Specs

### Easing Functions

All animations use Remotion's `Easing` namespace:

- **Fade in/out:** `Easing.out(Easing.cubic)` — slow start, fast finish
- **Scale animations:** `Easing.out(Easing.quad)` — snappy but smooth
- **Pan/translate:** `Easing.inOut(Easing.quad)` — balanced
- **Opacity transitions:** `Easing.cubic` — subtle
- **Exit animations:** `Easing.in(Easing.cubic)` — accelerating

### Frame Timing

```typescript
interpolate(frame, [startFrame, endFrame], [startValue, endValue], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic),
});
```

### Motion Curve Template

```typescript
// Fade in over 30 frames starting at frame N
const opacity = interpolate(frame, [N, N+30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.cubic)
});

// Translate up while fading
const translateY = interpolate(frame, [N, N+30], [20, 0], {...});
```

---

## Color & Theme Reference

| Element           | Color        | Hex     | Usage                 |
| ----------------- | ------------ | ------- | --------------------- |
| Primary Accent    | Cyan         | #00d9ff | Buttons, text, glows  |
| Secondary Accent  | Deep Cyan    | #0099cc | Hover states, shadows |
| Background Dark   | Almost Black | #0f0f0f | Main BG               |
| Background Medium | Dark Slate   | #1a1a2e | Card/overlay BG       |
| Text Primary      | White        | #ffffff | Headers, copy         |
| Text Secondary    | Gray         | #a0a0a0 | Subtitles, muted      |
| Success           | Cyan         | #00d9ff | Confirmed status      |
| Pending           | Amber        | #ffa500 | Pending status        |
| Accent Green      | Dark Green   | #0a3d2e | Impact scene BG       |

---

## Audio Integration Points

| Scene            | Timestamp | Audio Element                        |
| ---------------- | --------- | ------------------------------------ |
| 1 (Intro)        | 0:00      | Ambient pad intro (15s)              |
| 2 (Login)        | 0:15      | Transition whoosh, ambient continues |
| 3 (Dashboard)    | 0:35      | Uplifting synth melody               |
| 4 (Interactions) | 1:10      | Subtle UI interaction sounds         |
| 5 (Impact)       | 1:50      | Ethereal pads, nature-inspired tones |
| 6 (Responsive)   | 2:20      | Tech transition sounds               |
| 7 (Outro)        | 2:40      | Crescendo swell, fade out            |

---

## Delivery Checklist

- [ ] All 7 scenes composed and tested
- [ ] Remotion render preview functional
- [ ] HD render (1440x810 @ 30fps) exported
- [ ] YouTube render (1920x1080 @ 30fps) exported
- [ ] Audio mixed and synced
- [ ] Color grading pass complete
- [ ] Subtitles generated (optional)
- [ ] Final QA review (audio sync, no artifacts)
- [ ] Upload to storage/CDN
- [ ] Social media clips extracted (15s, 30s)
