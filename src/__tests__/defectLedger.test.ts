/**
 * Defect ledger — the "how done are we" guard.
 *
 * Every confirmed defect from the Aug 2026 sweeps (perf/animation classes
 * F1-F7/P1-P9 and correctness classes C1-C8) lives in defectLedger.json
 * with one or more machine-checkable checks:
 *
 *   - pattern-absent : the defect pattern must NOT match the file
 *   - pattern-present: the fix pattern MUST match the file
 *   - test           : a dedicated jest suite pins the behavior (existence
 *                      asserted here; the suite itself runs in npm test)
 *
 * The suite enforces the ledger in BOTH directions:
 *   - status "fixed" ⇒ every check passes (a regression flips the build red)
 *   - status "open"  ⇒ at least one check fails (fixing the defect forces
 *     you to flip the status, so the scorecard can never silently drift)
 *
 * Scorecard: `node scripts/defect-scorecard.js` prints fixed/open by severity
 * and class from the same JSON.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const LEDGER = path.join(__dirname, 'defectLedger.json');

interface LedgerCheck {
  type: 'pattern-absent' | 'pattern-present' | 'test';
  file?: string;
  pattern?: string;
  flags?: string;
  /** pattern-present only: exact required match count (default: >= 1). */
  count?: number;
  suite?: string;
}

interface LedgerEntry {
  id: string;
  title: string;
  file: string;
  klass: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'fixed';
  checks: LedgerCheck[];
}

const entries: LedgerEntry[] = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));

function runCheck(check: LedgerCheck): { pass: boolean; detail: string } {
  if (check.type === 'test') {
    const suitePath = path.join(ROOT, check.suite ?? '');
    const exists = fs.existsSync(suitePath);
    return {
      pass: exists,
      detail: exists ? `suite ${check.suite} exists` : `suite ${check.suite} MISSING`,
    };
  }
  const filePath = path.join(ROOT, check.file ?? '');
  if (!fs.existsSync(filePath)) {
    // A deleted file trivially satisfies "defect pattern absent" (dead code
    // removal is a legitimate fix) but can never satisfy pattern-present.
    return check.type === 'pattern-absent'
      ? { pass: true, detail: `${check.file} deleted` }
      : { pass: false, detail: `${check.file} missing` };
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const re = new RegExp(check.pattern ?? '', check.flags ?? 'g');
  const matches = source.match(re) ?? [];
  if (check.type === 'pattern-absent') {
    return {
      pass: matches.length === 0,
      detail: `${check.file}: ${matches.length} match(es) of /${check.pattern}/ (expected 0)`,
    };
  }
  const required = check.count;
  const pass = required === undefined ? matches.length >= 1 : matches.length === required;
  return {
    pass,
    detail: `${check.file}: ${matches.length} match(es) of /${check.pattern}/ (expected ${required ?? '>=1'})`,
  };
}

describe('ledger integrity', () => {
  it('has unique ids and at least one check per entry', () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of entries) {
      expect(e.checks.length).toBeGreaterThan(0);
    }
  });
});

const fixed = entries.filter((e) => e.status === 'fixed');
const open = entries.filter((e) => e.status === 'open');

(fixed.length > 0 ? describe : describe.skip)('fixed defects stay fixed', () => {
  it.each(fixed.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    const results = entry.checks.map(runCheck);
    // The failure output lists exactly which check regressed.
    expect(results.filter((r) => !r.pass).map((f) => f.detail)).toEqual([]);
  });
});

(open.length > 0 ? describe : describe.skip)('open defects are honestly open', () => {
  it.each(open.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    const results = entry.checks.map(runCheck);
    const failing = results.filter((r) => !r.pass);
    // If every check passes, the defect is fixed — flip its ledger status.
    expect(failing.length).toBeGreaterThan(0);
  });
});
