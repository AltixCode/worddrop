import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame, BarChart3, Library, Settings as SettingsIcon, Play, WifiOff } from 'lucide-react-native';
import { useGameStore } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { useMidnightCountdown } from '../src/hooks/useCountdown';
import { useDailyGame } from '../src/hooks/useDailyGame';
import { localDateString } from '../src/game/selection';
import { isStreakBroken, winPercentage } from '../src/game/streak';
import { AdBanner } from '../src/components/AdBanner';
import { ForwardChevron } from '../src/components/DirectionalIcons';
import { t } from '../src/i18n';

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{value}</Text>
      <Text
        numberOfLines={2}
        style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2, textAlign: 'center' }}
      >
        {label}
      </Text>
    </View>
  );
};

const NavRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, onPress }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        minHeight: 64,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: theme.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <ForwardChevron color={theme.textMuted} />
    </Pressable>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const today = localDateString();
  const stats = useGameStore((s) => s.stats);
  const hydrated = useGameStore((s) => s.hydrated);
  const countdown = useMidnightCountdown();
  const { board, loading, source, status } = useDailyGame(today);

  // A streak is only alive until a whole day is missed; showing yesterday's
  // number after that would be a lie the player finds out about tomorrow.
  const liveStreak = isStreakBroken(stats.lastPlayedDate, today) ? 0 : stats.currentStreak;

  const statusLabel = useMemo(() => {
    if (!board) return t('loading');
    if (board.status === 'won') return t('statusSolved', { count: board.guesses.length });
    if (board.status === 'lost') return t('statusMissed');
    return board.guesses.length ? t('statusInProgress') : t('statusNotStarted');
  }, [board]);

  const finished = status !== 'in_progress';
  const ctaLabel = finished
    ? t('seeResult')
    : board && board.guesses.length
      ? t('continueGame')
      : t('play');

  const onPlay = () => router.push(finished ? `/result?date=${today}` : `/game?date=${today}`);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              fontSize: 30,
              lineHeight: 36,
              fontWeight: '800',
              color: theme.text,
              letterSpacing: -0.6,
            }}
          >
            {t('tagline')}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 20,
            gap: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                {board ? t('puzzleNumber', { number: board.number }) : t('loading')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 4 }}>
                {statusLabel}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={20} color={liveStreak > 0 ? theme.warning : theme.textMuted} />
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{liveStreak}</Text>
            </View>
          </View>

          <Pressable
            onPress={onPlay}
            disabled={loading && !board}
            testID="home-play"
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
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
            {loading && !board ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <>
                <Play size={18} color={theme.onPrimary} fill={theme.onPrimary} />
                <Text style={{ color: theme.onPrimary, fontSize: 16, fontWeight: '800' }}>
                  {ctaLabel}
                </Text>
              </>
            )}
          </Pressable>

          <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center' }}>
            {t('nextPuzzleIn', { time: countdown })}
          </Text>

          {source === 'local' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <WifiOff size={14} color={theme.textMuted} />
              <Text style={{ flex: 1, fontSize: 12, color: theme.textMuted }}>
                {t('offlineNotice')}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 18,
            paddingVertical: 16,
          }}
        >
          <Stat label={t('played')} value={hydrated ? String(stats.played) : '—'} />
          <Stat label={t('winRate')} value={hydrated ? `${winPercentage(stats)}%` : '—'} />
          <Stat label={t('streak')} value={hydrated ? String(liveStreak) : '—'} />
          <Stat label={t('bestStreak')} value={hydrated ? String(stats.maxStreak) : '—'} />
        </View>

        <View style={{ gap: 10 }}>
          <NavRow
            icon={<BarChart3 size={19} color={theme.primary} />}
            title={t('statsTitle')}
            subtitle={t('statsDesc')}
            onPress={() => router.push('/stats')}
          />
          <NavRow
            icon={<Library size={19} color={theme.primary} />}
            title={t('archive')}
            subtitle={t('archiveDesc')}
            onPress={() => router.push('/archive')}
          />
          <NavRow
            icon={<SettingsIcon size={19} color={theme.primary} />}
            title={t('settingsTitle')}
            subtitle={t('settingsDesc')}
            onPress={() => router.push('/settings')}
          />
        </View>
      </ScrollView>

      <AdBanner />
    </SafeAreaView>
  );
}
