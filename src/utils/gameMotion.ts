export function isLastWordTensionActive(
  totalWords: number,
  remainingWords: number,
  status: string,
): boolean {
  return totalWords >= 4 && remainingWords === 1 && status === 'playing';
}

export interface WordBankMotionPolicy {
  showLastWordEmphasis: boolean;
  animateLastWordLoop: boolean;
  animateLastWordOvershoot: boolean;
  animateTrace: boolean;
  animateFoundChip: boolean;
  settledTraceValue: 1;
}

export function getWordBankMotionPolicy(
  tensionActive: boolean,
  reduceMotion: boolean,
): WordBankMotionPolicy {
  const motionAllowed = !reduceMotion;
  return {
    showLastWordEmphasis: tensionActive,
    animateLastWordLoop: tensionActive && motionAllowed,
    animateLastWordOvershoot: tensionActive && motionAllowed,
    animateTrace: motionAllowed,
    animateFoundChip: motionAllowed,
    settledTraceValue: 1,
  };
}

export interface PuzzleCompleteMotionPolicy {
  animateDecorations: boolean;
  animateEntrance: boolean;
  animateStars: boolean;
  animateScore: boolean;
  state: {
    overlayOpacity: number;
    cardTranslateY: number;
    ribbonProgress: number;
    statsProgress: number;
    actionsProgress: number;
    glitchProgress: number;
    cardScale: number;
    cardOpacity: number;
    flawlessBadgeScale: number;
    flawlessBadgeOpacity: number;
    starsRevealed: boolean;
    displayedScore: number;
  };
}

export function getPuzzleCompleteMotionPolicy(
  reduceMotion: boolean,
  finalScore: number,
): PuzzleCompleteMotionPolicy {
  const animate = !reduceMotion;
  return {
    animateDecorations: animate,
    animateEntrance: animate,
    animateStars: animate,
    animateScore: animate,
    state: {
      overlayOpacity: animate ? 0 : 1,
      cardTranslateY: animate ? 30 : 0,
      ribbonProgress: animate ? 0 : 1,
      statsProgress: animate ? 0 : 1,
      actionsProgress: animate ? 0 : 1,
      glitchProgress: 0,
      cardScale: animate ? 0.93 : 1,
      cardOpacity: animate ? 0 : 1,
      flawlessBadgeScale: animate ? 0.6 : 1,
      flawlessBadgeOpacity: animate ? 0 : 1,
      starsRevealed: !animate,
      displayedScore: animate ? 0 : finalScore,
    },
  };
}
