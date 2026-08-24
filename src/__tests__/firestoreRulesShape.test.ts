/**
 * Source-shape guards over firestore.rules + firestore.indexes.json.
 *
 * These artifacts deploy out-of-band (`firebase deploy --only
 * firestore:rules,firestore:indexes`) and nothing else in CI reads them, so
 * regressions are invisible to typecheck and unit tests. Three defect
 * classes are pinned here:
 *
 * 1. Leaderboard direct-write hardening. The dailyScores / weeklyScores /
 *    events-scores direct paths are the deliberate RC kill-switch fallback
 *    for the submitValidatedScore callable, but they previously accepted any
 *    score up to 1,000,000 — 100× the server's 10,000 daily ceiling and 4×
 *    its 250,000 weekly per-submission ceiling — letting a modded client
 *    skip the callable and take distributeWeeklyRewards' 1000-gem payout
 *    regardless of the leaderboardValidationEnabled flag. The rules must
 *    mirror the server ceilings, bind the bucket field to the doc id, and
 *    keep the callable's `server` / `validatedAt` markers client-unwritable.
 *
 * 2. puzzleResults forgery bounds. Each doc is an onCreate trigger input
 *    that increments club weeklyScore + goals, so the owner-write path must
 *    bound the payload to the server's own clamp ranges and stay immutable.
 *
 * 3. Collection-group index for Apple SSN. handleAppleSubscriptionEvent
 *    runs db.collectionGroup('purchases').where('transactionId','==',…), and
 *    collection-group queries need an explicit COLLECTION_GROUP-scope
 *    single-field override (automatic indexes are collection-scope only) —
 *    without it every Apple renewal/refund/revoke rejects FAILED_PRECONDITION.
 */

import * as fs from 'fs';
import * as path from 'path';

const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
const indexes = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../firestore.indexes.json'), 'utf8'),
) as {
  fieldOverrides?: Array<{
    collectionGroup: string;
    fieldPath: string;
    indexes: Array<{ queryScope: string; order?: string }>;
  }>;
};

/** Slice one match-block's body out of the rules source. */
function block(header: string, closeIndent: string): string {
  const start = rules.indexOf(header);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = rules.indexOf(`\n${closeIndent}}`, start);
  expect(end).toBeGreaterThan(start);
  return rules.slice(start, end);
}

describe('firestore.rules — leaderboard direct-write hardening', () => {
  const daily = block('match /dailyScores/{docId} {', '    ');
  const weekly = block('match /weeklyScores/{docId} {', '    ');
  const events = block('match /events/{eventId}/scores/{userId} {', '    ');

  it('no leaderboard score path accepts the old 1,000,000 ceiling', () => {
    // challengerScore (a display-only field) may keep its own sanity bound;
    // the ranked `score` field must not.
    expect(rules).not.toMatch(/data\.score <= 1000000/);
  });

  it('dailyScores mirrors the server ceilings and binds date to the doc id', () => {
    expect(daily).toMatch(/data\.score <= 10000/);
    expect(daily).toMatch(/data\.stars <= 3/);
    expect(daily).toMatch(
      /docId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.date/,
    );
    expect(daily).toMatch(/date\.matches\('\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}'\)/);
  });

  it('weeklyScores caps per-write growth at the server per-submission ceiling', () => {
    expect(weekly).toMatch(/data\.score <= 250000/); // create
    expect(weekly).toMatch(/request\.resource\.data\.score >= resource\.data\.score/);
    expect(weekly).toMatch(
      /request\.resource\.data\.score - resource\.data\.score <= 250000/,
    );
    expect(weekly).toMatch(
      /docId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.weekId/,
    );
    expect(weekly).toMatch(/weekId\.matches\('\[0-9\]\{4\}_W\[0-9\]\{2\}'\)/);
  });

  it('event scores bind eventId to the path and cap per-write growth', () => {
    expect(events).toMatch(/request\.resource\.data\.eventId == eventId/);
    expect(events).toMatch(/data\.score <= 250000/);
    expect(events).toMatch(
      /request\.resource\.data\.score - resource\.data\.score <= 250000/,
    );
  });

  it("the callable's server/validatedAt markers are client-unwritable on all three paths", () => {
    for (const b of [daily, weekly, events]) {
      const guards = b.match(/hasAny\(\['server', 'validatedAt'\]\)/g) ?? [];
      expect(guards.length).toBe(2); // create + update
      expect(b).toMatch(/!request\.resource\.data\.keys\(\)\.hasAny/);
    }
  });

  it('all three paths bound displayName and pin timestamp to request.time', () => {
    for (const b of [daily, weekly, events]) {
      expect(b).toMatch(/displayName\.size\(\) <= 40/);
      expect(b).toMatch(/data\.timestamp == request\.time/);
    }
  });
});

describe('firestore.rules — puzzleResults forgery bounds', () => {
  const puzzleResults = block('match /puzzleResults/{resultId} {', '      ');

  it('bounds the trigger payload to the server clamp ranges', () => {
    expect(puzzleResults).toMatch(/data\.score <= 250000/);
    expect(puzzleResults).toMatch(/data\.stars <= 3/);
    expect(puzzleResults).toMatch(/data\.wordsFound <= 1000/);
    expect(puzzleResults).toMatch(/data\.createdAt == request\.time/);
  });

  it('keeps results immutable once written', () => {
    expect(puzzleResults).toMatch(/allow update, delete: if false/);
  });
});

describe('firestore.indexes.json — collection-group coverage', () => {
  it('purchases.transactionId has a COLLECTION_GROUP-scope override for the Apple SSN lookup', () => {
    const override = (indexes.fieldOverrides ?? []).find(
      (o) => o.collectionGroup === 'purchases' && o.fieldPath === 'transactionId',
    );
    expect(override).toBeDefined();
    expect(
      override!.indexes.some((i) => i.queryScope === 'COLLECTION_GROUP'),
    ).toBe(true);
  });
});
