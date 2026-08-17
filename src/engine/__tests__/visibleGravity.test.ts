/**
 * Easy boards must SHOW gravity — the game's one differentiating mechanic.
 *
 * stackingPenalty steers placement toward column-disjoint layouts (correct
 * for fairness), but on 2-3 word easy boards that routinely produced
 * layouts where NO clear order moved a single letter of another word: the
 * tutorial teaches that clearing order reshapes the board, then levels 1-10
 * never demonstrate it. The generator now prefers a small shared-column
 * overlap for the last word placed on an easy gravity board (forgiveness
 * stays gated at 0.95, so nearly every order still wins — the reshape is
 * visible, not punishing).
 *
 * Measured at the time of pinning: 77% of easy boards had any shared-column
 * overlap before the preference, 97% after. The floor here (90%) leaves
 * room for seeds where no small-overlap candidate exists within the
 * placement budget without letting the property silently regress to the
 * disjoint-by-default world.
 */
import { generateBoard } from '../boardGenerator';
import { getLevelConfig } from '../../constants';

test('≥90% of easy boards have a shared-column word pair (visible gravity)', () => {
  let withOverlap = 0;
  const N = 60;
  for (let i = 0; i < N; i++) {
    const level = 1 + (i % 10);
    const config = getLevelConfig(level);
    const board = generateBoard(config, 1000 + i * 7919);
    const cols = new Map<number, Set<string>>();
    for (const p of board.words) {
      for (const pos of p.positions) {
        const set = cols.get(pos.col) ?? new Set<string>();
        set.add(p.word);
        cols.set(pos.col, set);
      }
    }
    if ([...cols.values()].some((s) => s.size > 1)) withOverlap++;
  }
  expect(withOverlap / N).toBeGreaterThanOrEqual(0.9);
}, 120000);
