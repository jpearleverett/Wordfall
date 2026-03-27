# Firestore Real-Time Social Features — Implementation Guide

This document details exactly how to implement the live social features that will transform Wordfall from a single-player game into a sticky social ecosystem. These are the highest-impact retention improvements available.

## Prerequisites

1. Firebase project with Firestore enabled (already scaffolded in `src/config/firebase.ts`)
2. Set `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`)
3. Firebase Auth (anonymous auth already scaffolded in `AuthContext`)
4. Firebase Cloud Functions for server-side logic (scheduled tasks, trust boundaries)

## Architecture Overview

```
Firestore Collections
├── users/{userId}           — Player profile, stats, push token
├── friendships/{id}         — Friend connections (bidirectional)
├── gifts/{id}               — Pending gift deliveries
├── clubs/{clubId}           — Club data, members, settings
│   └── messages/{msgId}     — Club chat messages
├── leaderboards/{boardId}   — Leaderboard entries
│   └── entries/{userId}     — Individual scores
├── partnerEvents/{eventId}  — Active partner event instances
└── globalEvents/{eventId}   — Community goal progress
```

---

## 1. Friend System

### Firestore Schema

```typescript
// users/{userId}
interface UserDoc {
  displayName: string;
  level: number;
  puzzlesSolved: number;
  currentStreak: number;
  equippedFrame: string;
  equippedTitle: string;
  lastActive: Timestamp;
  expoPushToken: string | null;
  friendIds: string[]; // Max ~200 for query efficiency
}

// friendships/{id} — id = sorted `${uid1}_${uid2}`
interface FriendshipDoc {
  users: [string, string];
  status: 'pending' | 'accepted';
  requestedBy: string;
  createdAt: Timestamp;
}
```

### Implementation Steps

1. **Add friend by code**: Generate a short friend code from `userId.slice(0, 8)`. Search `users` collection by code prefix.

2. **Friend request flow**:
   ```typescript
   // Send request
   const friendshipId = [myUid, theirUid].sort().join('_');
   await setDoc(doc(db, 'friendships', friendshipId), {
     users: [myUid, theirUid].sort(),
     status: 'pending',
     requestedBy: myUid,
     createdAt: serverTimestamp(),
   });
   ```

3. **Accept request**: Update `status` to `'accepted'`, add to both users' `friendIds` arrays.

4. **Real-time friend list**:
   ```typescript
   // Listen to friends' profiles for live status
   const q = query(
     collection(db, 'users'),
     where(documentId(), 'in', friendIds.slice(0, 10)) // Firestore 'in' limit = 10
   );
   onSnapshot(q, (snapshot) => {
     // Update friend list UI with live data
   });
   ```
   For >10 friends, batch into multiple queries.

5. **Friend comparison on PuzzleComplete**: Replace mock data with:
   ```typescript
   const friendScores = await getDocs(
     query(collection(db, 'leaderboards', `level_${level}`, 'entries'),
       where(documentId(), 'in', friendIds.slice(0, 10))
     )
   );
   const beaten = friendScores.docs.filter(d => d.data().score < myScore).length;
   ```

---

## 2. Gift System (Real-Time)

### Firestore Schema

```typescript
// gifts/{giftId}
interface GiftDoc {
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  type: 'hint' | 'tile';
  tileLetter?: string;
  claimed: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp; // Auto-delete after 7 days via TTL policy
}
```

### Implementation

1. **Send gift** (replace current local-only logic):
   ```typescript
   async function sendGift(toUserId: string, type: 'hint' | 'tile', tileLetter?: string) {
     // Check daily limits (already tracked in PlayerContext)
     const giftRef = doc(collection(db, 'gifts'));
     await setDoc(giftRef, {
       fromUserId: auth.currentUser.uid,
       fromDisplayName: player.displayName,
       toUserId,
       type,
       tileLetter,
       claimed: false,
       createdAt: serverTimestamp(),
       expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 3600 * 1000)),
     });

     // Send push notification to recipient
     // (via Cloud Function triggered by Firestore write)
   }
   ```

2. **Receive gifts** (real-time listener):
   ```typescript
   const q = query(
     collection(db, 'gifts'),
     where('toUserId', '==', myUid),
     where('claimed', '==', false)
   );
   onSnapshot(q, (snapshot) => {
     const pendingGifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
     // Show gift notification badge on friend tab
   });
   ```

3. **Claim gift**: Update `claimed: true`, award hint/tile to player locally + update Firestore user doc.

4. **Cloud Function**: Trigger push notification on gift creation:
   ```typescript
   // functions/src/index.ts
   exports.onGiftCreated = onDocumentCreated('gifts/{giftId}', async (event) => {
     const gift = event.data.data();
     const recipientDoc = await getDoc(doc(db, 'users', gift.toUserId));
     const pushToken = recipientDoc.data()?.expoPushToken;
     if (pushToken) {
       await sendExpoPushNotification(pushToken, {
         title: `${gift.fromDisplayName} sent you a gift!`,
         body: gift.type === 'hint' ? 'You received a hint!' : 'You received a rare tile!',
       });
     }
   });
   ```

---

## 3. Club System (Real-Time Chat + Events)

### Firestore Schema

```typescript
// clubs/{clubId}
interface ClubDoc {
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  memberCount: number;
  maxMembers: 30;
  autoKickDays: 14;
  weeklyScore: number;
  createdAt: Timestamp;
}

// clubs/{clubId}/messages/{messageId}
interface ClubMessageDoc {
  userId: string;
  displayName: string;
  text: string;
  reaction?: string; // emoji reaction
  type: 'chat' | 'system' | 'achievement' | 'rally_update';
  createdAt: Timestamp;
}
```

### Key Features

1. **Real-time chat**: `onSnapshot` on `messages` subcollection, ordered by `createdAt`, limit 50.

2. **Club Rally events**: When a Club Rally event is active, aggregate member scores:
   ```typescript
   // Cloud Function: runs every 5 minutes during Club Rally
   exports.updateClubRallyScores = onSchedule('every 5 minutes', async () => {
     const activeRally = await getActiveClubRally();
     if (!activeRally) return;

     const clubs = await getDocs(collection(db, 'clubs'));
     for (const club of clubs.docs) {
       const memberScores = await Promise.all(
         club.data().memberIds.map(uid =>
           getDocs(query(
             collection(db, 'leaderboards', activeRally.id, 'entries'),
             where(documentId(), '==', uid)
           ))
         )
       );
       const totalScore = memberScores.reduce((sum, snap) =>
         sum + (snap.docs[0]?.data()?.score || 0), 0);
       await updateDoc(club.ref, { weeklyScore: totalScore });
     }
   });
   ```

3. **Auto-kick inactive members** (Cloud Function, daily):
   ```typescript
   exports.autoKickInactive = onSchedule('every 24 hours', async () => {
     const clubs = await getDocs(collection(db, 'clubs'));
     const cutoff = Timestamp.fromDate(
       new Date(Date.now() - 14 * 24 * 3600 * 1000)
     );
     for (const club of clubs.docs) {
       for (const memberId of club.data().memberIds) {
         const userDoc = await getDoc(doc(db, 'users', memberId));
         if (userDoc.data()?.lastActive < cutoff) {
           await updateDoc(club.ref, {
             memberIds: arrayRemove(memberId),
             memberCount: increment(-1),
           });
         }
       }
     }
   });
   ```

---

## 4. Leaderboards (Real-Time)

### Firestore Schema

```typescript
// leaderboards/{boardId}/entries/{userId}
// boardId examples: "daily_2026-03-27", "weekly_2026-w13", "alltime", "event_speed_blitz_w13"
interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  level: number;
  equippedFrame: string;
  updatedAt: Timestamp;
}
```

### Implementation

1. **Submit score** (in handleComplete):
   ```typescript
   const boardId = isDaily ? `daily_${today}` : `alltime`;
   const entryRef = doc(db, 'leaderboards', boardId, 'entries', myUid);
   await setDoc(entryRef, {
     userId: myUid,
     displayName: player.displayName,
     score: totalScore,
     level: newLevel,
     equippedFrame: player.equippedFrame,
     updatedAt: serverTimestamp(),
   }, { merge: true }); // merge to keep highest score
   ```

2. **Read top 50**:
   ```typescript
   const q = query(
     collection(db, 'leaderboards', boardId, 'entries'),
     orderBy('score', 'desc'),
     limit(50)
   );
   onSnapshot(q, (snapshot) => {
     const leaderboard = snapshot.docs.map((d, i) => ({
       rank: i + 1,
       ...d.data(),
     }));
   });
   ```

3. **Friend leaderboard**: Filter entries where `userId in friendIds`.

---

## 5. Partner Events (Cooperative)

### Firestore Schema

```typescript
// partnerEvents/{eventId}
interface PartnerEventDoc {
  playerIds: [string, string];
  eventType: string;
  sharedGoal: number;
  contributions: Record<string, number>; // userId -> score contributed
  totalProgress: number;
  rewards: { coins: number; gems: number; exclusiveCosmetic?: string };
  startedAt: Timestamp;
  expiresAt: Timestamp;
  completed: boolean;
}
```

### Implementation

1. **Matchmaking** (Cloud Function):
   ```typescript
   // When player opts in, add to matchmaking queue
   // Cloud Function pairs players and creates partnerEvent doc
   exports.matchPartners = onDocumentCreated('partnerQueue/{queueId}', async (event) => {
     const player = event.data.data();
     // Find another player in queue within similar level range
     const candidates = await getDocs(query(
       collection(db, 'partnerQueue'),
       where('level', '>=', player.level - 5),
       where('level', '<=', player.level + 5),
       where('matched', '==', false),
       limit(1)
     ));

     if (candidates.empty) return; // Wait for another player

     const partner = candidates.docs[0];
     // Create partner event
     await setDoc(doc(collection(db, 'partnerEvents')), {
       playerIds: [player.userId, partner.data().userId],
       eventType: 'cooperative_words',
       sharedGoal: 50, // 50 words together
       contributions: { [player.userId]: 0, [partner.data().userId]: 0 },
       totalProgress: 0,
       rewards: { coins: 500, gems: 15 },
       startedAt: serverTimestamp(),
       expiresAt: Timestamp.fromDate(new Date(Date.now() + 48 * 3600 * 1000)),
       completed: false,
     });

     // Mark both as matched
     await updateDoc(event.data.ref, { matched: true });
     await updateDoc(partner.ref, { matched: true });

     // Send push notifications to both
   });
   ```

2. **Progress updates**: After each puzzle, update contribution:
   ```typescript
   const eventRef = doc(db, 'partnerEvents', activePartnerEventId);
   await updateDoc(eventRef, {
     [`contributions.${myUid}`]: increment(wordsFound),
     totalProgress: increment(wordsFound),
   });
   ```

3. **Real-time listener**: Both players see each other's contributions live via `onSnapshot`.

4. **Completion**: Cloud Function triggers when `totalProgress >= sharedGoal`, awards rewards to both players.

---

## 6. Community Goals (Global Events)

```typescript
// globalEvents/{eventId}
interface GlobalEventDoc {
  name: string;
  targetWords: number; // e.g., 1,000,000
  currentWords: number;
  contributors: number;
  startDate: Timestamp;
  endDate: Timestamp;
  milestoneRewards: { threshold: number; reward: { coins: number; gems: number } }[];
}
```

Use `increment()` for atomic updates. Display progress bar on EventScreen.

---

## 7. Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read any user profile, write only their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Friendships: both parties can read, only involved parties can write
    match /friendships/{friendshipId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.users;
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.users;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.users;
    }

    // Gifts: sender creates, recipient claims
    match /gifts/{giftId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.fromUserId ||
         request.auth.uid == resource.data.toUserId);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.fromUserId;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.toUserId &&
        request.resource.data.claimed == true;
    }

    // Leaderboards: anyone can read, write own entry
    match /leaderboards/{boardId}/entries/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Clubs: members can read/write, anyone can read public info
    match /clubs/{clubId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.auth.uid in resource.data.memberIds;

      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }

    // Partner events: only participants
    match /partnerEvents/{eventId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.playerIds;
    }

    // Global events: anyone can read, Cloud Functions write
    match /globalEvents/{eventId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

---

## 8. Migration Path

### Phase 1 (Week 1-2): Foundation
- Deploy Firestore rules
- Create `users/{userId}` doc on first auth (already have anonymous auth)
- Store Expo push token in user doc
- Wire `lastActive` timestamp on app foreground

### Phase 2 (Week 3-4): Friends + Gifts
- Implement friend code system
- Real-time gift sending/receiving
- Replace mock friend comparison with real Firestore queries
- Cloud Function for gift push notifications

### Phase 3 (Week 5-6): Leaderboards + Clubs
- Real-time leaderboard submission
- Club creation/join/chat
- Club Rally event scoring via Cloud Functions

### Phase 4 (Week 7-8): Partner Events + Polish
- Partner event matchmaking
- Real-time cooperative progress
- Community goal aggregation
- Auto-kick enforcement Cloud Function

### Estimated Firestore Costs
At 10K DAU:
- Reads: ~500K/day (~$0.30/day)
- Writes: ~100K/day (~$0.18/day)
- Storage: ~1GB ($0.18/month)
- **Total: ~$15-20/month** at 10K DAU

Firestore scales linearly. At 100K DAU: ~$150-200/month.

---

## Key Takeaways

1. **Start with friends + gifts** — lowest implementation cost, highest retention impact
2. **Use `onSnapshot` for real-time** — Firestore's real-time listeners are the killer feature
3. **Cloud Functions for trust boundaries** — never let clients directly award rewards or modify other users' data
4. **Batch operations** for leaderboard updates to stay within Firestore write limits
5. **TTL policies** on gifts and messages to keep storage costs down
