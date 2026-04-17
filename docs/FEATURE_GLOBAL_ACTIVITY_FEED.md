# Global Activity Feed — Social Network Style Activity System

**Status**: Planning  
**Epic**: Global Activity Feed & User Discovery  
**Priority**: High  
**Labels**: `activity`, `social`, `feed`, `real-time`

---

## Overview

Transform the current "Actividad reciente" (Recent Activity) from a per-user view into a **global activity feed** that shows all system activity with proper user attribution, timestamps, and social network features.

**Goals:**

- Show activity from all users across the platform
- Display proper user profiles & avatars with each activity
- Track when users were last active
- Sort by most recent activity (reverse chronological)
- Support filtering & search
- Real-time updates (optional: WebSocket for live feed)
- Build foundation for social features (follow, like, comment)

---

## Current State vs Target

### Current

```
Acción              Fuente        Airs    Fecha
─────────────────────────────────────────────────
Compensación...     Serventrega   +120    Ene 15/2026
Compra...           Serventrega   +80     Ene 15/2026
Perfil completado   Serventrega   +5      Ene 15/2026
```

**Issues:**

- Only shows current user's activities
- No user attribution
- No avatars or user context
- No "last active" tracking
- Not suitable for discovery

### Target

```
┌─────────────────────────────────────────────────────────┐
│  María González (@maria.gonzalez) — 2 horas ago        │
│  ✅ Completó su perfil → +5 AIRS                        │
│  Fue hace 2 horas • Ubicación: Buenos Aires            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Carlos Mendoza (@carlos.m) — 45 min ago               │
│  🛍️  Hizo una compra de compensación → +80 AIRS         │
│  Fue hace 45 minutos • Ubicación: LATAM                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Ana Ruiz (@ana_ruiz) — En línea ahora 🟢              │
│  🌱 Generó compensación ambiental → +120 AIRS          │
│  Hace <1 min • Ubicación: México                       │
└─────────────────────────────────────────────────────────┘
```

**Improvements:**

- ✅ All users' activities visible
- ✅ User avatars & usernames
- ✅ "Last active" status (now, 2h ago, etc.)
- ✅ Location context (optional)
- ✅ Real-time indicators
- ✅ Foundation for discovery

---

## Database Schema Changes

### 1. Expand `user_activity` table

```sql
CREATE TABLE user_activity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity metadata
  activity_type         TEXT NOT NULL,  -- 'profile_complete', 'purchase', 'earn_airs', etc.
  action_label          TEXT,           -- user-friendly label
  icon_emoji            TEXT,           -- 🌱, 🛍️, ✅, etc.
  airs_change           INTEGER,        -- positive or negative

  -- Context & metadata
  source                TEXT,           -- 'serventrega', 'platform', 'system', etc.
  metadata              JSONB,          -- extra context (product, location, etc.)

  -- Timestamps
  occurred_at           TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ DEFAULT now(),

  -- Visibility & permissions
  is_public             BOOLEAN DEFAULT true,
  visibility            TEXT DEFAULT 'public',  -- 'public', 'friends', 'private'

  -- Engagement (optional for Phase 2)
  like_count            INTEGER DEFAULT 0,
  comment_count         INTEGER DEFAULT 0,
  share_count           INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX user_activity_user_id_occurred_at
  ON user_activity(user_id, occurred_at DESC);
CREATE INDEX user_activity_occurred_at
  ON user_activity(occurred_at DESC);
CREATE INDEX user_activity_public
  ON user_activity(occurred_at DESC)
  WHERE is_public = true;
```

### 2. Track last activity per user

```sql
ALTER TABLE auth.users
ADD COLUMN last_activity_at TIMESTAMPTZ,
ADD COLUMN last_activity_type TEXT;

-- Trigger to update user's last_activity_at
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET
    last_activity_at = NEW.occurred_at,
    last_activity_type = NEW.activity_type
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_activity_insert
AFTER INSERT ON user_activity
FOR EACH ROW
EXECUTE FUNCTION update_user_last_activity();
```

### 3. Activity types enumeration

```sql
CREATE TYPE activity_type AS ENUM (
  'profile_complete',
  'airs_earned',
  'airs_spent',
  'purchase_made',
  'compensation_created',
  'project_joined',
  'avatar_updated',
  'bio_updated',
  'account_created',
  'level_up'
);
```

---

## API Endpoints

### 1. Get Global Activity Feed

```typescript
GET /activity/feed
  Query params:
    - limit: 20 (default)
    - offset: 0
    - sort: 'recent' | 'trending' | 'following'
    - activity_type: filter by type
    - search: search in activity descriptions

  Response:
  {
    data: [
      {
        id: "uuid",
        user: {
          id: "uuid",
          email: "user@example.com",
          displayName: "María González",
          username: "maria.gonzalez",
          avatarUrl: "https://...",
          location: "Buenos Aires",
          isOnline: true,
          lastActivityAt: "2026-04-17T14:30:00Z"
        },
        activityType: "profile_complete",
        actionLabel: "Completó su perfil",
        iconEmoji: "✅",
        airsChange: 5,
        source: "serventrega",
        metadata: {
          profileCompleteness: 100,
          fieldsCompleted: ["name", "avatar", "bio", "location"]
        },
        occurredAt: "2026-04-17T14:30:00Z",
        isPublic: true,
        visibility: "public",
        likeCount: 3,
        commentCount: 1,
        shareCount: 0,
        userLiked: false
      }
    ],
    pagination: {
      limit: 20,
      offset: 0,
      total: 245,
      hasMore: true
    }
  }
```

### 2. Get User's Activity

```typescript
GET /activity/user/:userId
  Query params:
    - limit: 20
    - offset: 0

  Response: similar to above
```

### 3. Get Activity Stats

```typescript
GET /activity/stats
  Response:
  {
    totalActivities: 1248,
    activeUsersToday: 342,
    activeUsersThisWeek: 1024,
    mostCommonActivity: "profile_complete",
    totalAirsTransferred: 45320
  }
```

### 4. Post Activity (internal use)

```typescript
POST /activity
  Body:
  {
    userId: "uuid",
    activityType: "profile_complete",
    actionLabel: "Completó su perfil",
    iconEmoji: "✅",
    airsChange: 5,
    source: "serventrega",
    metadata: {...},
    isPublic: true,
    visibility: "public"
  }

  Returns: created activity record
```

---

## Frontend Components

### 1. GlobalActivityFeed.tsx

```tsx
interface ActivityFeedProps {
  limit?: number;
  sort?: 'recent' | 'trending' | 'following';
  activityType?: string;
  userId?: string; // if specified, show only that user's activity
  realtime?: boolean; // subscribe to WebSocket updates
}

export function GlobalActivityFeed({
  limit = 20,
  sort = 'recent',
  activityType,
  userId,
  realtime = true,
}: ActivityFeedProps) {
  // Fetch feed
  // Handle infinite scroll
  // Display activity cards
  // Handle real-time updates
  // Support filtering & search
}
```

### 2. ActivityCard.tsx

```tsx
interface ActivityCardProps {
  activity: UserActivity;
  onLike?: (activityId: string) => void;
  onComment?: (activityId: string) => void;
  onShare?: (activityId: string) => void;
  onUserClick?: (userId: string) => void;
}

export function ActivityCard({
  activity,
  onLike,
  onComment,
  onShare,
  onUserClick,
}: ActivityCardProps) {
  return (
    <View style={styles.card}>
      {/* User header with avatar */}
      <UserHeader
        user={activity.user}
        lastActivityAt={activity.occurredAt}
        onPress={() => onUserClick?.(activity.user.id)}
      />

      {/* Activity description */}
      <ActivityDescription
        iconEmoji={activity.iconEmoji}
        actionLabel={activity.actionLabel}
        airsChange={activity.airsChange}
      />

      {/* Activity metadata */}
      <ActivityMeta activity={activity} />

      {/* Engagement actions */}
      <ActivityActions
        activity={activity}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
      />
    </View>
  );
}
```

### 3. UserHeader.tsx

```tsx
interface UserHeaderProps {
  user: User;
  lastActivityAt: Date;
  onPress?: () => void;
}

export function UserHeader({ user, lastActivityAt, onPress }: UserHeaderProps) {
  const timeAgo = getTimeAgo(lastActivityAt);
  const isOnline = isUserOnline(user.lastActivityAt);

  return (
    <TouchableOpacity style={styles.header} onPress={onPress}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        {isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}
```

---

## Activity Types & Examples

```typescript
enum ActivityType {
  // Onboarding
  ACCOUNT_CREATED = 'account_created', // 👤 Creó una cuenta
  PROFILE_COMPLETE = 'profile_complete', // ✅ Completó su perfil
  AVATAR_UPDATED = 'avatar_updated', // 🖼️  Actualizó su avatar

  // AIRS Economics
  AIRS_EARNED = 'airs_earned', // 📈 Ganó AIRS
  AIRS_SPENT = 'airs_spent', // 📉 Gastó AIRS

  // Purchases & Commerce
  PURCHASE_MADE = 'purchase_made', // 🛍️  Hizo una compra
  COMPENSATION_CREATED = 'compensation_created', // 🌱 Generó compensación

  // Participation
  PROJECT_JOINED = 'project_joined', // 🤝 Se unió a un proyecto
  COMMENT_POSTED = 'comment_posted', // 💬 Comentó

  // Social
  USER_FOLLOWED = 'user_followed', // ⭐ Siguió a un usuario
  MILESTONE_REACHED = 'milestone_reached', // 🏆 Alcanzó un hito
}
```

---

## Implementation Phases

### Phase 1: Core Feed (MVP)

**Deliverables:**

- [ ] `user_activity` table & indexes
- [ ] Activity tracking in AIRS service (profile complete, airs earned, etc.)
- [ ] `GET /activity/feed` endpoint (paginated)
- [ ] GlobalActivityFeed component
- [ ] ActivityCard component
- [ ] Basic filtering by activity type
- [ ] Infinite scroll / pagination

**Files:**

```
apps/api/src/modules/activity/
├── activity.controller.ts
├── activity.service.ts
├── activity.repository.ts
├── dtos/
│   ├── create-activity.dto.ts
│   └── activity-response.dto.ts
└── __tests__/
    └── activity.service.test.ts

apps/mobile/src/features/activity/
├── components/
│   ├── GlobalActivityFeed.tsx
│   ├── ActivityCard.tsx
│   └── UserHeader.tsx
├── hooks/
│   └── useActivityFeed.ts
└── screens/
    └── ActivityFeedScreen.tsx
```

### Phase 2: User Attribution & Profiles

**Deliverables:**

- [ ] User profile cards / quick view
- [ ] Online status indicator
- [ ] "Last active" tracking & display
- [ ] User avatar display
- [ ] Click-through to user profile
- [ ] Activity filtering by user

### Phase 3: Engagement & Social

**Deliverables:**

- [ ] Like / unlike activity
- [ ] Comments on activities
- [ ] Share activity (with attribution)
- [ ] Engagement counts
- [ ] Real-time updates (WebSocket)

### Phase 4: Discovery & Recommendations

**Deliverables:**

- [ ] Sort by "trending" (most liked/engaged)
- [ ] Sort by "following" (activities from followed users)
- [ ] Search activities
- [ ] Filter by location (optional)
- [ ] Recommended users to follow

### Phase 5: Real-time & Notifications

**Deliverables:**

- [ ] WebSocket for live feed updates
- [ ] Push notifications for friend activity
- [ ] Activity digest / daily summary
- [ ] User mention notifications

---

## Data Migration

### Backfill existing activities

```typescript
// Migration script to create user_activity records from existing data
async function backfillActivities() {
  // Extract from AIRS dashboard snapshot
  // Create profile_complete activities
  // Create airs_earned activities
  // Create purchases
  // Set proper timestamps from existing records
}
```

---

## UI/UX Considerations

1. **User Card Hierarchy**

   - Avatar (large, tappable)
   - Name + @username
   - "Last active" status
   - Location (optional badge)
   - Online indicator

2. **Activity Description**

   - Icon emoji + action label
   - AIRS change (green for +, red for -)
   - Relative time (2h ago, now, etc.)

3. **Engagement Zone**

   - Like count + heart button
   - Comment count + bubble button
   - Share count + share button

4. **Loading States**

   - Skeleton cards while fetching
   - Infinite scroll loader
   - Empty state (no activities)

5. **Filters & Search**
   - Activity type filter
   - Date range filter
   - Search by user/activity
   - Sort: Recent, Trending, Following

---

## Performance Optimization

1. **Database**

   - Index on `(occurred_at DESC)` for recent activities
   - Index on `(user_id, occurred_at DESC)` for user activities
   - Index on `(is_public)` for feed filtering
   - Pagination (no offset > 1000)

2. **API**

   - Cursor-based pagination (optional, for infinite scroll)
   - Response compression
   - Cache popular activities (Redis)
   - Background jobs to update `last_activity_at`

3. **Frontend**
   - Virtualized list (FlatList) for performance
   - Image optimization (avatar thumbnails)
   - Lazy load activity details
   - Debounce search input

---

## Security & Privacy

1. **Permissions**

   - Respect `is_public` flag
   - Only show `visibility: 'public'` activities in global feed
   - Respect user privacy settings
   - Hide sensitive metadata

2. **Rate Limiting**

   - Limit activity creation per user (prevent spam)
   - Limit feed requests per IP
   - Limit like/comment spam

3. **Content Moderation**
   - Flag inappropriate activities
   - Admin can hide/delete activities
   - User can delete their own activities

---

## Metrics & Analytics

Track:

- Total activities created per day
- Active users per day
- Most common activity types
- Engagement rates (likes, comments)
- Feed conversion (clicks to profile)
- User retention (daily actives)

---

## Success Criteria

### Phase 1

- [x] Global feed shows all activities in real-time
- [x] Proper user attribution with avatars
- [x] Pagination working smoothly
- [x] Activity types clearly displayed
- [x] Basic filtering working

### Phase 2-5

- [x] User discovery increases
- [x] Engagement metrics increase
- [x] Real-time updates working
- [x] Platform feels social & alive

---

## References

- Inspired by: Twitter/X timeline, Instagram feed, LinkedIn activity
- Similar patterns: Discord activity, Slack status, GitHub contributions
- Real-time: WebSocket for live updates, Redis for caching
