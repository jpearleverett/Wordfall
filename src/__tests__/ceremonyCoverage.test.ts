/**
 * EVERY CEREMONY THAT CAN BE QUEUED MUST HAVE SOMEWHERE TO RENDER.
 *
 * A ceremony is how the game hands the player a reward it has already
 * granted. Queue one the router does not handle and the grant still happens
 * — silently. Nothing throws, nothing logs, the player simply never learns
 * they earned it. There is no runtime signal for this at all, which is why
 * it is worth a build-time one.
 *
 * The union used to carry nine members belonging to VictorySummaryItem — the
 * inline rows on the victory screen, a different render surface — so
 * `queueCeremony({ type: 'star_milestone', … })` typechecked and would have
 * dropped the reward. Narrowing CeremonyItem made that a compile error; this
 * keeps both halves honest as ceremonies are added.
 *
 * Source-level on purpose: the failure is an absent caller / absent case, not
 * anything a rendered component would reveal.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');
const TYPES = path.join(ROOT, 'src/types.ts');
const ROUTER = path.join(ROOT, 'src/App/CeremonyRouter.tsx');

function unionMembers(source: string, interfaceName: string): string[] {
  const match = new RegExp(
    `export interface ${interfaceName} \\{\\s*type:(.*?);\\n`,
    's',
  ).exec(source);
  if (!match) throw new Error(`could not parse ${interfaceName} union`);
  return Array.from(new Set(match[1].match(/'([a-z_0-9]+)'/g) ?? [])).map((s) =>
    s.replace(/'/g, ''),
  );
}

describe('ceremony union and router agree', () => {
  const typesSource = fs.readFileSync(TYPES, 'utf8');
  const routerSource = fs.readFileSync(ROUTER, 'utf8');

  const variants = unionMembers(typesSource, 'CeremonyItem');
  const rendered = new Set(
    Array.from(
      routerSource.matchAll(/activeCeremony\?\.type === '([a-z_0-9]+)'/g),
      (m) => m[1],
    ),
  );

  it('parses both sides', () => {
    // Guard the guard: if either regex stops matching after a refactor this
    // suite would pass while checking nothing.
    expect(variants.length).toBeGreaterThan(10);
    expect(rendered.size).toBeGreaterThan(10);
  });

  it.each(variants)('%s has a render case in CeremonyRouter', (variant) => {
    expect(rendered.has(variant)).toBe(true);
  });

  it('the router does not render a type the union cannot express', () => {
    // The other direction. A stale case is dead code rather than a dropped
    // reward, but it means someone removed a ceremony and left half of it.
    const orphanCases = [...rendered].filter((r) => !variants.includes(r));
    expect(orphanCases).toEqual([]);
  });
});

describe('the two render surfaces stay separate', () => {
  const typesSource = fs.readFileSync(TYPES, 'utf8');
  const ceremonyVariants = unionMembers(typesSource, 'CeremonyItem');
  const summaryVariants = unionMembers(typesSource, 'VictorySummaryItem');

  it('a summary-only row cannot be queued as a full-screen ceremony', () => {
    // `mode_unlock` legitimately appears in both — an early mode unlock is an
    // inline row, a later one is a ceremony. Everything else overlapping
    // means a summary type has leaked back into the ceremony union, where it
    // would typecheck and render nothing.
    const overlap = summaryVariants.filter((s) => ceremonyVariants.includes(s));
    expect(overlap).toEqual(['mode_unlock']);
  });

  /**
   * Ceremonies the router can render but nothing queues, on purpose.
   *
   * A modal-fatigue pass demoted several celebrations to "Tier 3": the reward
   * and the analytics still fire, the full-screen modal does not. The render
   * cases were left in place, which is reasonable — re-promoting is then a
   * one-line change — but it makes them indistinguishable from a ceremony
   * that lost its caller by accident. Recording the decision here is what
   * makes the difference visible.
   */
  const DELIBERATELY_SILENT: Record<string, string> = {
    starter_pack_unlocked:
      'Tier 3 — player discovers via the Shop badge dot (useRewardWiring.ts:520)',
    first_mode_clear:
      'Tier 3 — silent, discovered via profile/achievements (useRewardWiring.ts:807)',
  };

  it('every ceremony variant is actually reachable from a queue site', () => {
    // A variant nobody queues is dead weight in the union that invites
    // exactly the mistake above. Scans the whole app for either enqueue path:
    // queueCeremony(...) and direct pendingCeremonies pushes in the contexts.
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && full !== TYPES) {
          sources.push(fs.readFileSync(full, 'utf8'));
        }
      }
    };
    walk(path.join(ROOT, 'src'));
    sources.push(fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8'));
    const haystack = sources.join('\n');

    const unreachable = ceremonyVariants.filter(
      (v) => !new RegExp(`type: '${v}'`).test(haystack) && !DELIBERATELY_SILENT[v],
    );
    expect(unreachable).toEqual([]);
  });

  it('the deliberately-silent list has not gone stale', () => {
    // If one of these is queued again, the entry is misleading and should be
    // removed — otherwise the list slowly becomes a place where real gaps
    // hide.
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && full !== TYPES) {
          sources.push(fs.readFileSync(full, 'utf8'));
        }
      }
    };
    walk(path.join(ROOT, 'src'));
    sources.push(fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8'));
    const haystack = sources.join('\n');

    for (const variant of Object.keys(DELIBERATELY_SILENT)) {
      expect(ceremonyVariants).toContain(variant);
      expect(new RegExp(`type: '${variant}'`).test(haystack)).toBe(false);
    }
  });
});
