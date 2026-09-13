import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Share, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, Flame, BarChart3, Crown } from 'lucide-react-native';
import { useGameStore, boardAnswer, boardGuesses } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { useMidnightCountdown } from '../src/hooks/useCountdown';
import { buildShareText, gridRow } from '../src/game/shareGrid';
import { localDateString } from '../src/game/selection';
import { isStreakBroken } from '../src/game/streak';
import { MAX_ATTEMPTS } from '../src/game/types';
import { showInterstitial } from '../src/services/ads';
import { t } from '../src/i18n';

export default function ResultScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? localDateString();

  const board = useGameStore((s) => s.boards[date]);
  const stats = useGameStore((s) => s.stats);
  const isPro = useGameStore((s) => s.isPro);
  const highContrast = useGameStore((s) => s.settings.highContrast);
  const hasSeenAdOn = useGameStore((s) => s.hasSeenAdOn);
  const markAdShown = useGameStore((s) => s.markAdShown);
  const countdown = useMidnightCountdown();
  const [shareError, setShareError] = useState<string | null>(null);
  const adRequested = useRef(false);

  const today = localDateString();
  const won = board?.status === 'won';
  const rows = useMemo(() => (board ? boardGuesses(board).map((g) => g.states) : []), [board]);

  useEffect(() => {
    // One interstitial per day, after the result is on screen — never between
    // guesses. A player who already saw today's ad, or who bought the unlock,
    // sees nothing.
    if (!board || board.status === 'in_progress' || isPro) return;
    if (adRequested.current || hasSeenAdOn(today)) return;
    adRequested.current = true;
    showInterstitial(isPro).then((shown) => {
      if (shown) markAdShown(today);
    });
  }, [board, hasSeenAdOn, isPro, markAdShown, today]);

  if (!board || board.status === 'in_progress') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, padding: 20 }}>
        <Text style={{ color: theme.textSecondary }}>{t('loading')}</Text>
      </SafeAreaView>
    );
  }

  const liveStreak = isStreakBroken(stats.lastPlayedDate, today) ? 0 : stats.currentStreak;

  const onShare = async () => {
    const message = buildShareText({
      puzzleNumber: board.number,
      rows,
      won,
      maxAttempts: MAX_ATTEMPTS,
      highContrast,
    });
    try {
      await Share.share({ message }, { dialogTitle: t('shareDialogTitle') });
      setShareError(null);
    } catch {
      setShareError(t('shareFailed'));
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
            {t('puzzleNumber', { number: board.number })}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text, letterSpacing: -0.4 }}>
            {won
              ? t('resultWinTitle', { count: board.guesses.length })
              : t('resultLossTitle')}
          </Text>
          <Text style={{ fontSize: 15, color: theme.textSecondary }}>
            {t('answerWas', { word: boardAnswer(board) })}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 18,
            padding: 18,
            alignItems: 'center',
            gap: 4,
          }}
        >
          {rows.map((row, i) => (
            <Text key={i} style={{ fontSize: 20, letterSpacing: 2 }}>
              {gridRow(row, highContrast)}
            </Text>
          ))}
        </View>

        <Pressable
          onPress={onShare}
          testID="result-share"
          accessibilityRole="button"
          accessibilityLabel={t('shareResult')}
          style={({ pressed }) => ({
            backgroundColor: theme.primary,
            borderRadius: 16,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Share2 size={18} color={theme.onPrimary} />
          <Text style={{ color: theme.onPrimary, fontSize: 16, fontWeight: '800' }}>
            {t('shareResult')}
          </Text>
        </Pressable>

        {shareError && (
          <Text style={{ color: theme.danger, fontSize: 13, textAlign: 'center' }}>{shareError}</Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 18,
            padding: 18,
            alignItems: 'center',
          }}
        >
          <Flame size={20} color={liveStreak > 0 ? theme.warning : theme.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>{t('statsCurrentStreak')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{liveStreak}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>{t('statsBestStreak')}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'right' }}>
              {stats.maxStreak}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13.5, color: theme.textSecondary, textAlign: 'center' }}>
          {t('comeBackTomorrow')} {t('nextPuzzleIn', { time: countdown })}
        </Text>

        <Pressable
          onPress={() => router.push('/stats')}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 48,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <BarChart3 size={17} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 15 }}>
            {t('viewStats')}
          </Text>
        </Pressable>

        {!isPro && (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Crown size={16} color={theme.warning} />
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>
              {t('removeAdsCta')}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
