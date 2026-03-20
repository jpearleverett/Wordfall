import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Board, CellPosition } from '../types';
import { useGame } from '../hooks/useGame';
import { GameGrid } from '../components/Grid';
import { WordBank } from '../components/WordBank';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { COLORS } from '../constants';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GameScreenProps {
  board: Board;
  level: number;
  isDaily?: boolean;
  onComplete: (stars: number, score: number) => void;
  onNextLevel: () => void;
  onHome: () => void;
}

export function GameScreen({
  board,
  level,
  isDaily = false,
  onComplete,
  onNextLevel,
  onHome,
}: GameScreenProps) {
  const {
    state,
    selectCell,
    clearSelection,
    submitWord,
    useHint,
    undoMove,
    newGame,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
  } = useGame(board, level);

  const [showComplete, setShowComplete] = useState(false);
  const [showStuck, setShowStuck] = useState(false);

  // Auto-submit when a valid word is selected
  useEffect(() => {
    if (isValidWord && currentWord.length >= 3) {
      // Small delay for visual feedback before submitting
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            300,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );
        submitWord();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isValidWord, currentWord]);

  // Show completion modal
  useEffect(() => {
    if (state.status === 'won' && !showComplete) {
      const timer = setTimeout(() => {
        setShowComplete(true);
        onComplete(stars, state.score);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Detect stuck state
  useEffect(() => {
    if (isStuck && !showStuck && state.status === 'playing') {
      const timer = setTimeout(() => setShowStuck(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowStuck(false);
    }
  }, [isStuck, state.status]);

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      selectCell(position);
    },
    [selectCell]
  );

  const handleHint = useCallback(() => {
    useHint();
  }, [useHint]);

  const handleUndo = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    undoMove();
    setShowStuck(false);
  }, [undoMove]);

  const handleRetry = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    newGame(board, level);
    setShowComplete(false);
    setShowStuck(false);
  }, [board, level, newGame]);

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    onNextLevel();
  }, [onNextLevel]);

  return (
    <View style={styles.container}>
      <GameHeader
        level={level}
        score={state.score}
        combo={state.combo}
        moves={state.moves}
        hintsLeft={state.hintsLeft}
        undosLeft={state.undosLeft}
        foundWords={foundWords}
        totalWords={totalWords}
        isDaily={isDaily}
        onHint={handleHint}
        onUndo={handleUndo}
        onBack={onHome}
      />

      {/* Stuck warning */}
      {showStuck && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>
            Stuck! Try undoing your last move.
          </Text>
        </View>
      )}

      {/* Grid area */}
      <View style={styles.gridArea}>
        <GameGrid
          grid={state.board.grid}
          selectedCells={state.selectedCells}
          onCellPress={handleCellPress}
        />
      </View>

      {/* Word bank */}
      <View style={styles.wordArea}>
        <WordBank
          words={state.board.words}
          currentWord={currentWord}
          isValidWord={isValidWord}
        />
      </View>

      {/* Completion overlay */}
      {showComplete && (
        <PuzzleComplete
          score={state.score}
          moves={state.moves}
          stars={stars}
          combo={state.maxCombo}
          level={level}
          isDaily={isDaily}
          onNextLevel={handleNextLevel}
          onHome={onHome}
          onRetry={handleRetry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gridArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  wordArea: {
    paddingBottom: 16,
  },
  stuckBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.coral,
    alignItems: 'center',
  },
  stuckText: {
    color: COLORS.coral,
    fontSize: 13,
    fontWeight: '600',
  },
});
