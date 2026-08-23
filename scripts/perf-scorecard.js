#!/usr/bin/env node
/**
 * Perf & animation doneness scorecard.
 *
 * Reads src/__tests__/perfAnimationLedger.json, re-runs every pattern check
 * against the current working tree, and prints completion by severity and
 * defect class. A "fixed" entry whose checks fail is flagged REGRESSED; an
 * "open" entry whose checks all pass is flagged FLIP-TO-FIXED (the jest
 * ledger suite fails on both until the ledger is corrected).
 *
 * Usage: node scripts/perf-scorecard.js [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'src/__tests__/perfAnimationLedger.json');
const entries = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const verbose = process.argv.includes('--verbose');

function runCheck(check) {
  if (check.type === 'test') {
    return fs.existsSync(path.join(ROOT, check.suite || ''));
  }
  const filePath = path.join(ROOT, check.file || '');
  if (!fs.existsSync(filePath)) return check.type === 'pattern-absent';
  const source = fs.readFileSync(filePath, 'utf8');
  const matches = source.match(new RegExp(check.pattern || '', check.flags || 'g')) || [];
  if (check.type === 'pattern-absent') return matches.length === 0;
  return check.count === undefined ? matches.length >= 1 : matches.length === check.count;
}

const rows = entries.map((e) => {
  const passing = e.checks.every(runCheck);
  const state = passing ? 'fixed' : 'open';
  const drift =
    e.status === 'fixed' && !passing
      ? 'REGRESSED'
      : e.status === 'open' && passing
        ? 'FLIP-TO-FIXED'
        : '';
  return { ...e, measured: state, drift };
});

const total = rows.length;
const done = rows.filter((r) => r.measured === 'fixed').length;
const pct = total === 0 ? 100 : Math.round((done / total) * 100);

function bucket(keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, { done: 0, total: 0 });
    const b = map.get(k);
    b.total += 1;
    if (r.measured === 'fixed') b.done += 1;
  }
  return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

console.log('');
console.log('  Wordfall perf & animation scorecard');
console.log('  ===================================');
console.log(`  DONE ${done}/${total}  (${pct}%)`);
console.log('');
console.log('  By severity:');
for (const [k, b] of bucket((r) => r.severity)) {
  console.log(`    ${String(k).padEnd(8)} ${b.done}/${b.total}`);
}
console.log('  By class:');
for (const [k, b] of bucket((r) => r.klass)) {
  console.log(`    ${String(k).padEnd(8)} ${b.done}/${b.total}`);
}
const drifted = rows.filter((r) => r.drift);
if (drifted.length > 0) {
  console.log('');
  console.log('  LEDGER DRIFT (jest ledger suite will fail):');
  for (const r of drifted) console.log(`    ${r.drift.padEnd(14)} ${r.id}`);
}
const openRows = rows.filter((r) => r.measured === 'open');
if (openRows.length > 0) {
  console.log('');
  console.log('  Open defects:');
  for (const r of openRows) {
    console.log(`    [${r.severity}] ${r.id} — ${r.title}`);
  }
}
if (verbose) {
  console.log('');
  for (const r of rows) {
    console.log(`  ${r.measured === 'fixed' ? '✓' : '✗'} ${r.id} (${r.klass}, ${r.severity}) ${r.file}`);
  }
}
console.log('');
process.exit(drifted.length > 0 ? 1 : 0);
