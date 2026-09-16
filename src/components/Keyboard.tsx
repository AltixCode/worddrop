import React, { useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Delete, CornerDownLeft } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { useGameStore } from '../store/useGameStore';
import { t } from '../i18n';
import type { LetterState } from '../game/types';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

interface Props {
  states: Record<string, LetterState>;
  disabled: boolean;
  onKey: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
}

export const Keyboard: React.FC<Props> = ({ states, disabled, onKey, onEnter, onDelete }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const hapticsOn = useGameStore((s) => s.settings.haptics);

  const tap = useCallback(
    (run: () => void, style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => () => {
      if (hapticsOn) Haptics.impactAsync(style);
      run();
    },
    [hapticsOn],
  );

  const gap = 5;
  // The cap is what made the keyboard look wrong on a 13" iPad.
  //
  // At `Math.min(width, 520)` the keyboard is the same physical size on a 1032pt
  // iPad as on a 390pt phone -- a small island of 45pt keys marooned in the
  // bottom third of a very large screen, which is what "most of the space is
  // empty and the characters are tiny" describes. Points are density
  // independent, so the letters were never shrinking; everything around them
  // was growing and they were not.
  const isTablet = width >= 700;
  const available = Math.min(width, isTablet ? 820 : 520) - 16;
  const keyWidth = Math.floor((available - gap * 9) / 10);
  // 48dp is the Android minimum and the iOS 44pt minimum sits inside it; the
  // keyboard never shrinks below it however narrow the device is. The upper
  // bound lifts on a tablet for the same reason the cap does.
  const keyHeight = Math.max(48, Math.min(isTablet ? 76 : 58, Math.round(keyWidth * 1.35)));
  // Scale the glyph with the key, the way GuessGrid already scales its letters
  // with the tile (`size * 0.46`). A fixed 16 inside a 75pt key is the defect,
  // not the key size.
  const keyFontSize = Math.max(16, Math.round(keyWidth * 0.36));

  const backgroundFor = (letter: string): string => {
    switch (states[letter]) {
      case 'correct':
        return theme.tileCorrect;
      case 'present':
        return theme.tilePresent;
      case 'absent':
        return theme.tileAbsent;
      default:
        return theme.keyBackground;
    }
  };

  const foregroundFor = (letter: string): string =>
    states[letter] ? theme.onTile : theme.keyText;

  return (
    <View style={{ gap, paddingHorizontal: 8, paddingBottom: 4 }}>
      {ROWS.map((row, rowIndex) => (
        <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', gap }}>
          {rowIndex === 2 && (
            <Pressable
              onPress={tap(onEnter, Haptics.ImpactFeedbackStyle.Medium)}
              disabled={disabled}
              testID="key-enter"
              accessibilityRole="button"
              accessibilityLabel={t('enterKey')}
              accessibilityState={{ disabled }}
              style={({ pressed }) => ({
                width: keyWidth * 1.6,
                height: keyHeight,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
                opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
              })}
            >
              <CornerDownLeft size={18} color={theme.onPrimary} />
            </Pressable>
          )}

          {[...row].map((letter) => (
            <Pressable
              key={letter}
              onPress={tap(() => onKey(letter))}
              disabled={disabled}
              testID={`key-${letter}`}
              accessibilityRole="button"
              accessibilityLabel={t('letterA11y', { letter })}
              accessibilityState={{ disabled }}
              style={({ pressed }) => ({
                width: keyWidth,
                height: keyHeight,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: backgroundFor(letter),
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              })}
            >
              <Text
                allowFontScaling={false}
                style={{ fontSize: keyFontSize, fontWeight: '700', color: foregroundFor(letter) }}
              >
                {letter}
              </Text>
            </Pressable>
          ))}

          {rowIndex === 2 && (
            <Pressable
              onPress={tap(onDelete)}
              disabled={disabled}
              testID="key-delete"
              accessibilityRole="button"
              accessibilityLabel={t('deleteKey')}
              accessibilityState={{ disabled }}
              style={({ pressed }) => ({
                width: keyWidth * 1.6,
                height: keyHeight,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.keyBackground,
                opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
              })}
            >
              <Delete size={18} color={theme.keyText} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
};
