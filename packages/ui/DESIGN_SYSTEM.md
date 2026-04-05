# Alternun Design System

Single source of truth for all UI tokens, primitives, and patterns used across `apps/web` and `apps/mobile`.

Import everything from `@alternun/ui` — never hardcode colors, spacing, or radius values inline.

---

## Design Tokens

### Colors — `palette`

```ts
import { palette } from '@alternun/ui';
```

| Token                     | Value     | Use                                  |
| ------------------------- | --------- | ------------------------------------ |
| `palette.teal`            | `#1ccba1` | Primary accent, CTAs, active states  |
| `palette.tealDark`        | `#0d9488` | Primary accent on light backgrounds  |
| `palette.tealLight`       | `#5bf6d0` | Highlight / glow on dark backgrounds |
| `palette.statusBronze`    | `#cd7f32` | Bronze tier badge                    |
| `palette.statusSilver`    | `#a8b8cc` | Silver tier badge                    |
| `palette.statusGold`      | `#d4b96a` | Gold tier badge                      |
| `palette.statusPlatinum`  | `#9ba9c4` | Platinum tier badge                  |
| `palette.heroForestDark`  | `#050f0c` | HeroPanel dark background            |
| `palette.heroForestLight` | `#eaf8f3` | HeroPanel light background           |
| `palette.error`           | `#f87171` | Destructive states                   |
| `palette.success`         | `#34d399` | Success states                       |
| `palette.warning`         | `#f59e0b` | Warning states                       |
| `palette.info`            | `#818cf8` | Info states                          |

**Never** hardcode `#1ccba1`, `rgba(28,203,161,…)` etc. inline — reference `palette.teal` or `theme.accent`.

---

### Spacing — `spacing`

```ts
import { spacing } from '@alternun/ui';
// spacing[1] = 4, spacing[2] = 8, spacing[3] = 12, spacing[4] = 16 …
```

| Key           | px  |
| ------------- | --- |
| `spacing[1]`  | 4   |
| `spacing[2]`  | 8   |
| `spacing[3]`  | 12  |
| `spacing[4]`  | 16  |
| `spacing[5]`  | 20  |
| `spacing[6]`  | 24  |
| `spacing[8]`  | 32  |
| `spacing[10]` | 40  |
| `spacing[12]` | 48  |

---

### Border Radius — `radius`

```ts
import { radius } from '@alternun/ui';
```

| Token           | px   | Use                    |
| --------------- | ---- | ---------------------- |
| `radius.sm`     | 8    | Inputs, small chips    |
| `radius.md`     | 12   | Cards, modals inner    |
| `radius.lg`     | 16   | Cards                  |
| `radius.xl`     | 20   | Stat cards             |
| `radius['2xl']` | 24   | Modals, panels         |
| `radius['3xl']` | 32   | Hero panels            |
| `radius.full`   | 9999 | Pills, avatars, badges |

---

### Typography — `fontSize`

```ts
import { fontSize } from '@alternun/ui';
```

| Token             | px  | Use                  |
| ----------------- | --- | -------------------- |
| `fontSize.xs`     | 11  | Captions, metadata   |
| `fontSize.sm`     | 12  | Labels, pill text    |
| `fontSize.base`   | 14  | Body, dropdown items |
| `fontSize.md`     | 15  | Body emphasis        |
| `fontSize.lg`     | 17  | Section headers      |
| `fontSize.xl`     | 20  | Sub-headings         |
| `fontSize['2xl']` | 24  | Headings             |
| `fontSize['3xl']` | 28  | Large headings       |
| `fontSize['4xl']` | 36  | Hero greeting        |
| `fontSize['5xl']` | 48  | Score display        |

---

## Theme System

```ts
import { ThemeProvider, useTheme, darkTheme, lightTheme } from '@alternun/ui';
```

Wrap screens in `<ThemeProvider mode="dark" | "light">`. All components in `@alternun/ui` consume `useTheme()` automatically.

### `AlternunTheme` key tokens

| Token                  | Light                    | Dark                     | Use                 |
| ---------------------- | ------------------------ | ------------------------ | ------------------- |
| `theme.screenBg`       | `#f1f5f9`                | `#050510`                | Screen background   |
| `theme.cardBg`         | `rgba(255,255,255,0.97)` | `rgba(13,13,31,0.96)`    | Card/panel surface  |
| `theme.cardBorder`     | `rgba(15,23,42,0.10)`    | `rgba(255,255,255,0.08)` | Card border         |
| `theme.textPrimary`    | `#0f172a`                | `#e8e8ff`                | Primary text        |
| `theme.textSecondary`  | `#334155`                | `rgba(232,232,255,0.75)` | Secondary text      |
| `theme.textMuted`      | `#475569`                | `rgba(232,232,255,0.55)` | Labels, captions    |
| `theme.accent`         | `#0d9488`                | `#1ccba1`                | Accent / teal       |
| `theme.accentMuted`    | `rgba(13,148,136,0.12)`  | `rgba(28,203,161,0.16)`  | Accent backgrounds  |
| `theme.divider`        | `rgba(15,23,42,0.10)`    | `rgba(255,255,255,0.10)` | Divider lines       |
| `theme.primaryBtnBg`   | `#0d9488`                | `#1ccba1`                | Primary button fill |
| `theme.primaryBtnText` | `#ffffff`                | `#050510`                | Primary button text |

---

## Primitives

### Avatar

Circular initials badge. Derives initials from a display name.

```tsx
import { Avatar, getInitials } from '@alternun/ui';

<Avatar name="José Santiago" size={32} />   // "JS"
<Avatar size={28} />                          // "U" fallback
```

**Props:** `name?: string`, `size?: number`

---

### Button

Full-featured button with variants, sizes, icon slots, loading state.

```tsx
import { Button } from '@alternun/ui';

<Button title="Sign In" onPress={fn} />
<Button title="Cancel" variant="secondary" size="sm" onPress={fn} />
<Button title="Delete" variant="danger" onPress={fn} />
<Button title="Saving…" onPress={fn} loading />
<Button title="Deposit" onPress={fn} icon={<ArrowUp size={14} />} />
<Button title="Submit" onPress={fn} fullWidth />
```

**Props:** `title`, `onPress`, `variant?: 'primary'|'secondary'|'danger'`, `size?: 'sm'|'md'|'lg'`, `disabled?`, `loading?`, `icon?`, `trailingIcon?`, `fullWidth?`

---

### ActionButton

Compact rounded pill for inline card actions (Deposit, Retire, Transfer).

```tsx
import { ActionButton } from '@alternun/ui';

<ActionButton label="Deposit"  onPress={fn} variant="filled" />
<ActionButton label="Retire"   onPress={fn} variant="outlined" />
<ActionButton label="Transfer" onPress={fn} variant="ghost" icon={<ArrowRight size={12} />} />
```

**Props:** `label`, `onPress`, `variant?: 'filled'|'outlined'|'ghost'`, `icon?`, `trailingIcon?`, `disabled?`

---

### Divider

1 px horizontal line using `theme.divider`.

```tsx
import { Divider } from '@alternun/ui';

<Divider />
<Divider spacing={16} />             // 16 px vertical margin
<Divider color="rgba(255,0,0,0.2)" />
```

**Props:** `spacing?: number`, `color?: string`

---

### InfoRow

Label / value pair. Used in modals, detail panels.

```tsx
import { InfoRow } from '@alternun/ui';

<InfoRow label="Position"    value="POS-000" />
<InfoRow label="Total Value" value="$0.00"   valueBold />
<InfoRow label="Profit Share" value="12%"   valueAccent />
<InfoRow label="Sold" value="0%" spacing={8} />
```

**Props:** `label`, `value`, `valueAccent?`, `valueBold?`, `spacing?: number`

---

### Modal

Composable modal shell with backdrop, header, scrollable body, optional footer.

```tsx
import { Modal } from '@alternun/ui';

<Modal
  visible={open}
  title="Deposit Token"
  onClose={() => setOpen(false)}
  footer={<Button title="Confirm" onPress={handleConfirm} fullWidth />}
>
  <InfoRow label="Token" value="#000" />
  <InfoRow label="Pool"  value="Main" />
</Modal>

// Bottom-sheet
<Modal visible={open} title="Connect Wallet" position="bottom" onClose={onClose}>
  ...
</Modal>
```

**Props:** `visible`, `title`, `onClose`, `position?: 'center'|'bottom'`, `children`, `footer?`, `maxContentHeight?`

---

### StatCard

Metric card with icon, value, delta badge.

```tsx
import { StatCard, StatCardSkeleton } from '@alternun/ui';

<StatCard
  label="Total Airs Earned"
  value="12,480"
  delta="+340"
  deltaPositive
  accentColor={palette.teal}
  icon={<TrendingUp size={16} color={palette.teal} />}
/>

// Loading state
{isLoading ? <StatCardSkeleton /> : <StatCard ... />}
```

---

### HeroPanel

Full-width hero with score, tier badge, progress bar. Core of the Airs dashboard.

```tsx
import { HeroPanel, resolveTier, TIERS } from '@alternun/ui';

<HeroPanel
  displayName='José Santiago'
  score={12480}
  isDark
  brandMark={<AirsBrandMark size={44} fillColor={palette.teal} cutoutColor='#050f0c' />}
/>;
```

**Tier system:**

| Tier     | Range        | Color                    |
| -------- | ------------ | ------------------------ |
| Bronze   | 0–999        | `#cd7f32`                |
| Silver   | 1,000–4,999  | `palette.statusSilver`   |
| Gold     | 5,000–19,999 | `palette.statusGold`     |
| Platinum | 20,000+      | `palette.statusPlatinum` |

```ts
const tier = resolveTier(12480); // 'gold'
const spec = TIERS[tier]; // { label, color, min, max, next, … }
```

---

### ProgressBar

Animated progress bar with optional labels and shimmer.

```tsx
import { ProgressBar } from '@alternun/ui';

<ProgressBar progress={0.62} />
<ProgressBar
  progress={0.62}
  color={palette.statusGold}
  height={7}
  showLabel
  label="Progress to Platinum"
  trailingLabel="12,480 / 20,000"
/>
```

**Props:** `progress` (0–1), `color?`, `height?`, `showLabel?`, `label?`, `trailingLabel?`, `animate?`

---

### Pill Components

```tsx
import { StatusPill, FilterPill, CountBadge } from '@alternun/ui';

// Token / position status
<StatusPill status="Free" />
<StatusPill status="Deposited" />
<StatusPill status="Consumed" />
<StatusPill status="GOLD" />

// Filter row
<FilterPill label="All"       active={filter === 'All'}       onPress={() => setFilter('All')} />
<FilterPill label="Free"      active={filter === 'Free'}      onPress={() => setFilter('Free')} />

// Count badge
<CountBadge count={3} />
<CountBadge count={12} color={palette.warning} />
```

**StatusPill presets:** `Free`, `Deposited`, `Consumed`, `Open`, `Closed`, `GOLD`, `PLATINUM`, `SILVER`

---

### GlassCard / GlassChip

Glass-morphism surfaces with variant-based border colours.

```tsx
import { GlassCard, GlassChip } from '@alternun/ui';

<GlassCard variant="teal" padding={16}>
  <Text>Content</Text>
</GlassCard>

<GlassChip variant="gold">Status GOLD</GlassChip>
```

**Variants:** `default` | `teal` | `gold` | `danger`

---

### IconBadge

Coloured circular background for a lucide icon.

```tsx
import { IconBadge } from '@alternun/ui';
import { Wallet } from 'lucide-react-native';

<IconBadge icon={<Wallet size={16} color={palette.teal} />} color={palette.teal} size='md' />;
```

**Sizes:** `sm` (28 px) | `md` (36 px) | `lg` (48 px)

---

### Toast / ToastSystem

```tsx
import { ToastSystem, type ToastItem, type ToastType } from '@alternun/ui';

const [toasts, setToasts] = useState<ToastItem[]>([]);

function addToast(type: ToastType, title: string, message?: string) {
  const id = `toast-${Date.now()}`;
  setToasts((prev) => [...prev, { id, type, title, message }]);
  setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
}

// Render at root of screen
<ToastSystem toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />;
```

**Toast types:** `success` | `error` | `info` | `warning`

---

### Skeleton Loaders

```tsx
import {
  SkeletonLoader,
  StatCardSkeleton,
  LedgerRowSkeleton,
  SectionHeaderSkeleton,
  PillRowSkeleton,
} from '@alternun/ui';

{isLoading ? <StatCardSkeleton /> : <StatCard ... />}
{isLoading ? <SectionHeaderSkeleton /> : <SectionLabel ... />}
{isLoading ? <LedgerRowSkeleton /> : <LedgerRow ... />}
```

---

## Rules & Anti-Patterns

| ✅ Do                               | ❌ Don't                         |
| ----------------------------------- | -------------------------------- |
| `color: theme.accent`               | `color: '#1ccba1'`               |
| `borderRadius: radius.full`         | `borderRadius: 9999`             |
| `padding: spacing[4]`               | `padding: 16`                    |
| `fontSize: fontSize.sm`             | `fontSize: 12`                   |
| `<FilterPill>` from `@alternun/ui`  | Inline `TouchableOpacity` pill   |
| `<InfoRow>` from `@alternun/ui`     | Inline label/value pair          |
| `<Modal>` from `@alternun/ui`       | Inline `Modal` from react-native |
| `<ProgressBar>` from `@alternun/ui` | Inline `View` progress track     |
| `<ToastSystem>` from `@alternun/ui` | Custom local ToastSystem         |

---

## Adding a New Component

1. Create `packages/ui/src/components/MyComponent.tsx`
2. Use `useTheme()` for colours, `spacing`/`radius`/`fontSize` tokens for layout
3. Export from `packages/ui/src/index.ts`
4. Document here with usage example and props table
