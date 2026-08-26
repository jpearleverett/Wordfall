/**
 * The chip's measured box, in the three dimensions that decide where the
 * flex-wrap panel breaks lines.
 *
 * This is not styling trivia. The word band sits above a flex:1 grid area, so
 * a chip that changes size when a word is found (or when the traced word goes
 * valid) can re-wrap the panel, change the band's height, and re-measure the
 * grid — and a grid re-measure lands one to three frames after the word-clear
 * commit, i.e. while the gravity cascade is still in its hold. Grid re-targets
 * a pitch change now instead of snapping to it, but the cheapest fix is for
 * the chip simply never to change size, which is what these two states being
 * dimensionally equal guarantees. `chipBoxWidthDelta`/`chipBoxHeightDelta`
 * pin it (see __tests__/wordBankChipBox.test.ts).
 *
 * The found badge is likewise always mounted and only faded, rather than
 * appearing on the found transition and growing the chip by its width plus the
 * row gap.
 */
export const CHIP_BOX = {
  resting: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  // A thicker emphasis border with the padding trimmed by the same amount, so
  // the outside of the box does not move.
  emphasis: { borderWidth: 2, paddingHorizontal: 8, paddingVertical: 4 },
  badgeSize: 16,
  gap: 4,
} as const;

/** Horizontal size difference between a resting chip and an emphasized one. */
export function chipBoxWidthDelta(): number {
  const w = (b: { borderWidth: number; paddingHorizontal: number }) =>
    2 * (b.borderWidth + b.paddingHorizontal);
  return w(CHIP_BOX.emphasis) - w(CHIP_BOX.resting);
}

/** Vertical size difference between a resting chip and an emphasized one. */
export function chipBoxHeightDelta(): number {
  const h = (b: { borderWidth: number; paddingVertical: number }) =>
    2 * (b.borderWidth + b.paddingVertical);
  return h(CHIP_BOX.emphasis) - h(CHIP_BOX.resting);
}
