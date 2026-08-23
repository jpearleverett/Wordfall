export function isLastWordTensionActive(
  totalWords: number,
  remainingWords: number,
  status: string,
): boolean {
  return totalWords >= 4 && remainingWords === 1 && status === 'playing';
}
