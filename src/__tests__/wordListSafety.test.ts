/**
 * THE FIND-LIST DICTIONARY MUST NOT CONTAIN SLURS OR PROFANITY.
 *
 * `src/words.ts` is not background filler — it is the pool the puzzle's
 * FIND-LIST is drawn from. A word that lands in it is rendered as a chip in
 * the word bank and the player is instructed to go find it. That is a
 * categorically worse failure than an offensive string appearing by accident
 * in filler letters, and for a Google Play title with a family audience it is
 * a store-listing risk, not just a taste one.
 *
 * Nine such words shipped in the curated list: the ethnic/religious epithets
 * ABO, GYP, WOPS and the homophobic FAGS, plus ASS, SHIT, PISS, TIT and
 * PRICK. Chapter theme words hide them on the curated classic path — 0 of
 * 1200 classic boards surfaced one — but every dictionary-only path is
 * exposed, and that includes the emergency fallback boards generated at
 * App.tsx:308/717/1007/1080/1773 when normal generation fails. Measured
 * before removal: 1.60% of boards on the easy fallback config (3-4 letter
 * window, exactly where the 3-letter slurs live) and 0.57% on a themeless
 * medium config put one on the find-list — roughly one board in sixty asking
 * the player to find a slur.
 *
 * The list below is deliberately broader than what was actually present, so
 * it guards future dictionary additions rather than just pinning today's fix.
 */
import { getWordsByLength, getAllWords, WORD_LISTS } from '../words';

/** Terms that must never be selectable as a find-list word. */
const BLOCKED = [
  // Ethnic, religious and national epithets
  'ABO', 'COON', 'COONS', 'KIKE', 'KIKES', 'SPIC', 'SPICS', 'WOG', 'WOGS',
  'YID', 'YIDS', 'GYP', 'GYPS', 'GYPPED', 'JAP', 'JAPS', 'PAKI', 'PAKIS',
  'GOOK', 'GOOKS', 'DAGO', 'DAGOS', 'WOP', 'WOPS', 'CHINK', 'CHINKS',
  'SQUAW', 'SQUAWS', 'REDSKIN', 'NEGRO', 'NEGROES', 'MICK', 'MICKS',
  // Homophobic and transphobic slurs
  'FAG', 'FAGS', 'FAGGOT', 'FAGGOTS', 'DYKE', 'DYKES', 'TRANNY', 'TRANNIES',
  // Ableist slurs
  'RETARD', 'RETARDS', 'SPAZ', 'SPAZZ', 'MONGOL', 'CRIPPLE',
  // Profanity and sexual anatomy
  'ASS', 'ARSE', 'SHIT', 'SHITS', 'FUCK', 'FUCKS', 'CUNT', 'CUNTS', 'TWAT',
  'PISS', 'PISSED', 'TIT', 'TITS', 'TITTY', 'SLUT', 'SLUTS', 'WHORE',
  'WHORES', 'DICK', 'DICKS', 'COCK', 'COCKS', 'PRICK', 'PRICKS', 'BITCH',
  'BITCHES', 'BASTARD', 'WANK', 'WANKER', 'TURD', 'TURDS', 'PORN', 'PORNO',
  'ORGY', 'HORNY', 'SEMEN', 'PENIS', 'VAGINA', 'ANUS', 'RECTUM', 'BOOB', 'BOOBS',
];

/**
 * Malformations found by cross-referencing all 8,287 entries against four
 * reference wordlists (ENABLE1, dwyl words_alpha, SOWPODS/Collins, TWL/OWL).
 * Each of these appears in NONE of them — they are truncations (CASIN for
 * CASINO, IRCHES for BIRCHES, RESOLV, RUTHLE), impossible inflections (HOAXS
 * and LASHS where the stem takes -ES, BULLYS/NANNYS/PENNYS where consonant+Y
 * takes -IES, PURED for PUREED, UNGREW), or corruptions of a neighbouring
 * entry (MIXERY, THINDS, GLOSSS).
 *
 * They matter because the word bank renders one as a chip and instructs the
 * player to trace it. Nothing softlocks — the word IS placed and traceable —
 * but a word game telling you to find CASIN spends credibility it cannot get
 * back.
 *
 * Obscure-but-attested words are deliberately NOT here: SIXER, TOCK, ACER and
 * friends are real, and a real word wrongly removed is a worse outcome than an
 * obscure one kept.
 */
const NOT_WORDS = [
  'VERM', 'ZEBS', 'ZENS', 'CASIN', 'FUSER', 'GRIMS', 'HOAXS', 'LASHS', 'PURED',
  'TYPER', 'UNDOS', 'BULLYS', 'GLOSSS', 'GNASHS', 'HANDLY', 'IRCHES', 'MIXERY',
  'MUNCHY', 'NANNYS', 'OUGHTA', 'PENNYS', 'RESOLV', 'RUTHLE', 'THINDS',
  'TRAWLY', 'UNGREW',
];

describe('find-list dictionary contains only real words', () => {
  it('none of the audited malformations are back', () => {
    const all = getAllWords();
    expect(NOT_WORDS.filter((w) => all.has(w))).toEqual([]);
  });

  it('every entry sits in the bucket matching its length', () => {
    // A word in the wrong bucket is served for a length window it does not
    // fit, which breaks placement rather than just taste.
    for (const [len, words] of Object.entries(WORD_LISTS)) {
      const wrong = words.filter((w) => w.length !== Number(len));
      expect(wrong).toEqual([]);
    }
  });

  it('has no duplicate entries', () => {
    const all = Object.values(WORD_LISTS).flat();
    expect(all.length - new Set(all).size).toBe(0);
  });
});

describe('find-list dictionary is safe for a family audience', () => {
  it('contains no blocked term in any length bucket', () => {
    const all = getAllWords();
    const present = BLOCKED.filter((w) => all.has(w));
    // Reported as the full list, because the fix is to delete every one of
    // them from src/words.ts in a single pass.
    expect(present).toEqual([]);
  });

  it('contains no blocked term in the SELECTABLE 3-6 letter pool', () => {
    // The window every shipping config draws from. A blocked word outside it
    // would still be wrong, but this is the one that reaches players.
    const selectable = new Set(getWordsByLength(3, 6));
    const present = BLOCKED.filter((w) => selectable.has(w));
    expect(present).toEqual([]);
  });

  it('guards the guard — the dictionary is actually loaded and non-trivial', () => {
    // Without this, a words.ts that failed to parse would make the checks
    // above pass vacuously forever.
    const all = getAllWords();
    expect(all.size).toBeGreaterThan(5000);
    for (const len of [3, 4, 5, 6]) {
      expect(WORD_LISTS[len].length).toBeGreaterThan(100);
    }
  });
});
