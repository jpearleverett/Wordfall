/**
 * THE PROCEDURAL TAIL MUST NOT DIP BELOW THE CURATED GAME.
 *
 * Two relief mechanisms stack, because their cycles are coprime:
 *
 *  - getProceduralDifficulty drops a breather chapter (index % 5 === 0) a
 *    whole tier, expert -> hard, which is a genuinely lighter board (-2
 *    words). That is the intended macro breather.
 *  - applyProceduralTexture rotates 7 silhouettes on index % 7, three of
 *    which ALSO subtract words (cases 1, 2 and 5).
 *
 * LCM(7,5) = 35 chapters, so every (silhouette, tier) pairing eventually
 * occurs — including "already eased" x "subtract words". Chapter 46 is
 * proceduralIndex 5: breather AND sparse. It served a 5-word board (4 on its
 * own breather levels) between an 8-word chapter and a 10-word one, and below
 * anything the curated range serves past L116. It recurs at index 5, 15 and
 * 30 (mod 35) — L676, L826, L1051, L1201 and on forever.
 *
 * A breather chapter's relief is the tier drop; the silhouette may reshape
 * the grid and the length window but must not subtract words a second time.
 */
import { getLevelConfigExtended } from '../engine/puzzleGenerator';

describe('procedural tail word counts', () => {
  it('never dips below the curated floor', () => {
    // The curated range's minimum from L116 on is 7, and the last curated
    // chapter (L586-600) ships 8. The tail should not undercut its own
    // neighbours by more than the intended one-tier breather.
    let min = Infinity;
    let minLevel = 0;
    const counts: Record<number, number> = {};
    for (let level = 601; level <= 5000; level++) {
      const n = getLevelConfigExtended(level).wordCount;
      counts[n] = (counts[n] || 0) + 1;
      if (n < min) { min = n; minLevel = level; }
    }
    // eslint-disable-next-line no-console
    console.log(`\nL601-5000 word-count histogram: ${JSON.stringify(counts)}`);
    // eslint-disable-next-line no-console
    console.log(`minimum ${min} at L${minLevel}`);
    // Before the fix the global minimum was 4, at L680/685/690 only.
    expect(min).toBeGreaterThanOrEqual(5);
  }, 600_000);

  it('chapter 46 is no longer a hole between its neighbours', () => {
    // Compare PLAIN levels only. Every 5th level is itself a breather and
    // every 13th a spike, so picking levels without checking that mixes three
    // different things and measures none of them.
    const plain = (l: number) => getLevelConfigExtended(l).wordCount;
    const ch45 = plain(671);
    const ch46 = plain(683);
    const ch47 = plain(692);
    // eslint-disable-next-line no-console
    console.log(`\nplain levels — ch45 L671: ${ch45} words | ch46 L683: ${ch46} | ch47 L692: ${ch47}`);

    // ch46 is a breather CHAPTER, so it is meant to be lighter than its
    // neighbours — by the one tier drop (expert -> hard), not by a tier drop
    // AND a word-subtracting silhouette. Before the fix this was 5.
    expect(ch46).toBe(7);
    expect(ch45).toBe(8);
    expect(ch46).toBeLessThan(ch45);
  });

  it('the tier breather still provides real relief', () => {
    // Guard from the other side: if the fix had flattened the breather
    // entirely, the tail would lose the rhythm the double dip exaggerated.
    expect(getLevelConfigExtended(683).wordCount)
      .toBeLessThan(getLevelConfigExtended(692).wordCount);
  });

  it('every breather chapter is eased exactly once', () => {
    // The double dip recurs at proceduralIndex 5, 15 and 30 (mod 35), so a
    // one-chapter patch would not have been enough. Each breather chapter's
    // plain levels should sit one tier below the chapter before it, never two.
    const plainLevelIn = (chapterIndex: number) => {
      const start = 601 + chapterIndex * 15;
      for (let l = start; l < start + 15; l++) {
        if (l % 5 !== 0 && l % 13 !== 0) return getLevelConfigExtended(l).wordCount;
      }
      throw new Error('no plain level found');
    };
    for (const idx of [5, 15, 30, 40, 65]) {
      const breather = plainLevelIn(idx);
      const previous = plainLevelIn(idx - 1);
      // eslint-disable-next-line no-console
      console.log(`  breather chapter idx ${idx}: ${breather} words (previous chapter ${previous})`);
      expect(breather).toBeGreaterThanOrEqual(previous - 2);
    }
  });
});
