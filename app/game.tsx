import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import { useDailyGame } from '../src/hooks/useDailyGame';
import { GuessGrid } from '../src/components/GuessGrid';
import { Keyboard } from '../src/components/Keyboard';
import { Toast } from '../src/components/Toast';
import { useTheme } from '../src/theme/useTheme';
import { localDateString } from '../src/game/selection';
import { MAX_ATTEMPTS } from '../src/game/types';
import { t } from '../src/i18n';

/** Guesses a player must spend before the clue is offered. */
const CLUE_AFTER = 3;

export default function GameScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? localDateString();

  const game = useDailyGame(date);
  const { board, loading, played, status } = game;

  useEffect(() => {
    // The result screen owns the celebration, the share grid and the ad; the
    // board stays on screen for a moment first so the last row's reveal is seen.
    if (status === 'in_progress') return undefined;
    const timer = setTimeout(() => router.replace(`/result?date=${date}`), 1400);
    return () => clearTimeout(timer);
  }, [date, router, status]);

  if (loading || !board) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const remaining = MAX_ATTEMPTS - played.length;
  const clueUnlocked = played.length >= CLUE_AFTER;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View
              style={{
                backgroundColor: theme.primaryMuted,
                borderColor: theme.primaryBorder,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>
                {board.category}
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12.5, fontWeight: '600' }}>
              {status === 'in_progress'
                ? t('guessesLeft', { count: remaining })
                : t('puzzleNumber', { number: board.number })}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minHeight: 56,
            }}
          >
            <Lightbulb size={16} color={clueUnlocked ? theme.warning : theme.textMuted} />
            <Text
              style={{
                flex: 1,
                fontSize: 13.5,
                lineHeight: 19,
                color: clueUnlocked ? theme.text : theme.textMuted,
                fontStyle: clueUnlocked ? 'normal' : 'italic',
              }}
            >
              {clueUnlocked ? board.clue : t('clueLocked')}
            </Text>
          </View>
        </View>

        <View style={{ paddingVertical: 12 }}>
          <GuessGrid
            length={board.length}
            rows={MAX_ATTEMPTS}
            played={played}
            current={game.current}
            shakeToken={game.shakeToken}
          />
        </View>

        <Keyboard
          states={game.keyboard}
          disabled={status !== 'in_progress'}
          onKey={game.pressLetter}
          onEnter={game.submit}
          onDelete={game.pressDelete}
        />
      </View>

      <Toast message={game.message} onDismiss={game.clearMessage} />
    </SafeAreaView>
  );
}
