import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../constants';
import { errorHaptic } from '../../services/haptics';
import { soundManager } from '../../services/sound';
import { useGameStore } from '../../stores/gameStore';
import GameIcon from '../../components/icons/GameIcon';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export const ConnectedTimerMovesBars = React.memo(
  function ConnectedTimerMovesBars({
    hasTimer,
    hasMoveLimit,
    totalSeconds,
    maxMoves,
  }: {
    hasTimer: boolean;
    hasMoveLimit: boolean;
    totalSeconds: number;
    maxMoves: number;
  }) {
    const timeRemaining = useGameStore((state) => state.timeRemaining);
    const moves = useGameStore((state) => state.moves);
    const warned30Ref = useRef(false);
    const warned10Ref = useRef(false);
    const prevTimeRef = useRef(timeRemaining);

    useEffect(() => {
      const prev = prevTimeRef.current;
      prevTimeRef.current = timeRemaining;
      if (!hasTimer) return;
      if (timeRemaining > prev) {
        if (timeRemaining > 30) warned30Ref.current = false;
        if (timeRemaining > 10) warned10Ref.current = false;
        return;
      }
      if (
        !warned30Ref.current &&
        timeRemaining <= 30 &&
        timeRemaining > 10 &&
        totalSeconds > 30
      ) {
        warned30Ref.current = true;
        void errorHaptic();
        void soundManager.playSound('timerWarning30s');
      }
      if (
        !warned10Ref.current &&
        timeRemaining <= 10 &&
        timeRemaining > 0 &&
        totalSeconds > 10
      ) {
        warned10Ref.current = true;
        void errorHaptic();
        void soundManager.playSound('timerWarning10s');
      }
    }, [timeRemaining, hasTimer, totalSeconds]);

    return (
      <>
        {hasTimer && (
          <View
            style={[
              styles.timerBar,
              timeRemaining <= 30 &&
                timeRemaining > 0 &&
                styles.timerBarDanger,
              timeRemaining <= 0 && styles.barHidden,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <GameIcon
                name="hourglass"
                size={16}
                accent={timeRemaining <= 30 ? COLORS.coral : undefined}
              />
              <Text
                style={[
                  styles.timerText,
                  timeRemaining <= 30 && styles.timerTextDanger,
                ]}
              >
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
        )}
        {hasMoveLimit && maxMoves > 0 && (
          <View
            style={[
              styles.moveBar,
              moves >= maxMoves - 1 && styles.moveBarDanger,
            ]}
          >
            <Text
              style={[
                styles.moveText,
                moves >= maxMoves - 1 && styles.moveTextDanger,
              ]}
            >
              Moves: {moves}/{maxMoves}
            </Text>
          </View>
        )}
      </>
    );
  },
);

const styles = StyleSheet.create({
  barHidden: {
    opacity: 0,
  },
  timerBar: {
    backgroundColor: 'rgba(26, 10, 46, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 45, 149, 0.30)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  timerBarDanger: {
    backgroundColor: 'rgba(60, 15, 20, 0.75)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
    shadowColor: COLORS.coral,
    shadowOpacity: 0.3,
  },
  timerText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    fontSize: 16,
    letterSpacing: 3,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  timerTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 12,
  },
  moveBar: {
    backgroundColor: 'rgba(26, 10, 46, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 77, 255, 0.20)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  moveBarDanger: {
    backgroundColor: 'rgba(60, 15, 20, 0.75)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
    shadowColor: COLORS.coral,
    shadowOpacity: 0.3,
  },
  moveText: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  moveTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 10,
  },
});
