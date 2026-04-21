export interface ModeTutorialStep {
  title: string;
  description: string;
  icon: string;
  highlight?: 'grid' | 'wordbank' | 'gravity';
}

export const MODE_TUTORIALS: Record<string, ModeTutorialStep[]> = {
  gravityFlip: [
    { title: 'Rotating Gravity', description: 'In this mode, gravity changes direction after each word you find!', icon: '\u{1F504}' },
    { title: 'Plan Ahead', description: 'After your first word, letters fall RIGHT instead of down. Then UP, then LEFT, then back to DOWN.', icon: '\u{1F9ED}', highlight: 'gravity' },
    { title: 'Word Order Matters', description: 'Think about where letters will land before you clear a word. The gravity shift can reveal — or hide — your next word!', icon: '\u{1F4A1}' },
  ],
  shrinkingBoard: [
    { title: 'Shrinking Board', description: 'The board gets smaller as you play! The outer ring of letters disappears every 2 words.', icon: '\u{1F4D0}' },
    { title: 'Work Inward', description: 'Words near the edges will vanish first. Find outer words before they disappear!', icon: '⏳', highlight: 'grid' },
    { title: 'No Gravity Here', description: 'Letters stay in place when cleared — no falling. Plan your path carefully!', icon: '\u{1F3AF}' },
  ],
  timePressure: [
    { title: 'Race the Clock', description: 'You have a limited time to find all words. Speed matters!', icon: '⏱️' },
    { title: 'Stay Flawless', description: 'Clear the puzzle without hints or undos to keep your flawless streak alive for milestone rewards.', icon: '⚡' },
  ],
  perfectSolve: [
    { title: 'Perfect or Nothing', description: 'No hints, no undos, no mistakes allowed. Every move must count!', icon: '✨' },
    { title: 'Think First', description: 'Study the board carefully before making your first move. There are no second chances!', icon: '\u{1F9E0}' },
  ],
};

export function getModeTutorial(modeId: string): ModeTutorialStep[] | null {
  return MODE_TUTORIALS[modeId] || null;
}
