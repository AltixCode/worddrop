import React, { useEffect } from 'react';
import { View, Text, useWindowDimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { t } from '../i18n';
import type { LetterState, PlayedGuess } from '../game/types';

const FLIP_MS = 220;
const STAGGER_MS = 130;

interface TileProps {
  letter: string;
  state: LetterState | 'empty' | 'pending';
  /** Position in its row, used to stagger the reveal. */
  index: number;
  /** True only for the row that has just been submitted. */
  animate: boolean;
  size: number;
  reduceMotion: boolean;
}

const Tile: React.FC<TileProps> = ({ letter, state, index, animate, size, reduceMotion }) => {
  const theme = useTheme();
  const settled = state === 'correct' || state === 'present' || state === 'absent';
  const progress = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const pop = useSharedValue(1);
  // The colour swaps at the half-way point of the flip, where the tile is
  // edge-on and the change is hidden. Driving that from state rather than from
  // the shared value keeps the render pure: reading `progress.value` during
  // render would be a one-off snapshot that never updates.
  const [showResult, setShowResult] = React.useState(!animate || reduceMotion || !settled);

  useEffect(() => {
    if (animate && settled && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        index * STAGGER_MS,
        withTiming(1, { duration: FLIP_MS * 2, easing: Easing.out(Easing.quad) }),
      );
      setShowResult(false);
      const timer = setTimeout(() => setShowResult(true), index * STAGGER_MS + FLIP_MS);
      return () => clearTimeout(timer);
    }
    progress.value = 1;
    setShowResult(true);
    return undefined;
  }, [animate, index, progress, reduceMotion, settled]);

  useEffect(() => {
    if (state === 'pending' && letter && !reduceMotion) {
      pop.value = withSequence(withTiming(1.06, { duration: 60 }), withTiming(1, { duration: 90 }));
    }
  }, [letter, pop, reduceMotion, state]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const rotate = p < 0.5 ? p * 180 : (1 - p) * 180;
    return {
      transform: [{ perspective: 600 }, { rotateX: `${rotate}deg` }, { scale: pop.value }],
    };
  });

  const resultColor =
    state === 'correct'
      ? theme.tileCorrect
      : state === 'present'
        ? theme.tilePresent
        : theme.tileAbsent;

  const background = settled && showResult
    ? resultColor
    : letter
      ? theme.tilePending
      : theme.tileEmpty;

  const border =
    settled && showResult
      ? resultColor
      : letter
        ? theme.tilePendingBorder
        : theme.tileEmptyBorder;

  const a11y = letter
    ? settled
      ? t('tileA11y', {
          letter,
          state: t(
            state === 'correct'
              ? 'stateCorrect'
              : state === 'present'
                ? 'statePresent'
                : 'stateAbsent',
          ),
        })
      : t('letterA11y', { letter })
    : t('tileEmptyA11y');

  return (
    <Animated.View
      accessible
      accessibilityLabel={a11y}
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.18),
          borderWidth: 2,
          borderColor: border,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontSize: Math.round(size * 0.46),
          fontWeight: '800',
          letterSpacing: 1,
          color: settled && showResult ? theme.onTile : theme.text,
        }}
      >
        {letter}
      </Text>
    </Animated.View>
  );
};

interface GridProps {
  length: number;
  rows: number;
  played: PlayedGuess[];
  current: string;
  /** Set when the current guess was rejected, to shake that row once. */
  shakeToken: number;
}

export const GuessGrid: React.FC<GridProps> = ({
  length,
  rows,
  played,
  current,
  shakeToken,
}) => {
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setReduceMotion(on));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!shakeToken || reduceMotion) return;
    shake.value = withSequence(
      withRepeat(withTiming(1, { duration: 55 }), 4, true),
      withTiming(0, { duration: 55 }),
    );
  }, [reduceMotion, shake, shakeToken]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (shake.value - 0.5) * 10 }],
  }));

  // The board must fit the narrowest supported phone with its gutters intact,
  // and must not grow into a wall of letters on a tablet.
  const gap = 6;
  const available = Math.min(width - 40, 380);
  const size = Math.floor((available - gap * (length - 1)) / length);

  return (
    <View style={{ alignItems: 'center', gap }}>
      {Array.from({ length: rows }).map((_, rowIndex) => {
        const play = played[rowIndex];
        const isCurrentRow = rowIndex === played.length;
        const letters = play?.guess ?? (isCurrentRow ? current : '');
        const justPlayed = rowIndex === played.length - 1;

        const row = (
          <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
            {Array.from({ length }).map((__, col) => (
              <Tile
                key={col}
                index={col}
                size={size}
                reduceMotion={reduceMotion}
                animate={Boolean(play) && justPlayed}
                letter={letters[col] ?? ''}
                state={
                  play
                    ? play.states[col]
                    : isCurrentRow && letters[col]
                      ? 'pending'
                      : 'empty'
                }
              />
            ))}
          </View>
        );

        return isCurrentRow ? (
          <Animated.View key={rowIndex} style={shakeStyle}>
            {row}
          </Animated.View>
        ) : (
          row
        );
      })}
    </View>
  );
};
