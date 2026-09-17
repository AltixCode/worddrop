import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lock, Check, X, Circle } from 'lucide-react-native';
import { useGameStore } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { dayIndexForDate, dateForDayIndex, localDateString } from '../src/game/selection';
import { ForwardChevron } from '../src/components/DirectionalIcons';
import { t } from '../src/i18n';
import { useTabletColumn } from '../src/theme/useTabletColumn';

interface Row {
  date: string;
  number: number;
}

export default function ArchiveScreen() {
  const router = useRouter();

  const tabletColumn = useTabletColumn();
  const theme = useTheme();
  const isPro = useGameStore((s) => s.isPro);
  const boards = useGameStore((s) => s.boards);

  const today = localDateString();
  const rows: Row[] = useMemo(() => {
    const todayIndex = dayIndexForDate(today);
    const out: Row[] = [];
    // Yesterday backwards to launch day. Today is played from the home screen,
    // so it is deliberately absent here.
    for (let i = todayIndex - 1; i >= 0; i -= 1) {
      out.push({ date: dateForDayIndex(i), number: i + 1 });
    }
    return out;
  }, [today]);

  if (!isPro) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center', gap: 16 }}>
          <View
            style={{
              alignSelf: 'center',
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: theme.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={26} color={theme.primary} />
          </View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: '800',
              color: theme.text,
              textAlign: 'center',
              letterSpacing: -0.3,
            }}
          >
            {t('archiveLockedTitle')}
          </Text>
          <Text
            style={{
              fontSize: 14.5,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {t('archiveLockedDesc')}
          </Text>
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel={t('lifetimeAccessPlain')}
            style={({ pressed }) => ({
              backgroundColor: theme.primary,
              borderRadius: 16,
              minHeight: 54,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: theme.onPrimary, fontSize: 16, fontWeight: '800' }}>
              {t('lifetimeAccessPlain')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (rows.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center' }}>
            {t('archiveEmpty')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.date}
        contentContainerStyle={{ padding: 20, gap: 10 , ...tabletColumn }}
        renderItem={({ item }) => {
          const board = boards[item.date];
          const status: 'won' | 'lost' | 'in_progress' | 'unplayed' =
            board?.status ?? 'unplayed';
          const label =
            status === 'won'
              ? t('archiveSolved')
              : status === 'lost'
                ? t('archiveMissed')
                : t('archiveUnplayed');
          const color =
            status === 'won'
              ? theme.tileCorrect
              : status === 'lost'
                ? theme.danger
                : theme.textMuted;

          return (
            <Pressable
              onPress={() =>
                router.push(
                  status === 'won' || status === 'lost'
                    ? `/result?date=${item.date}`
                    : `/game?date=${item.date}`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`${t('puzzleNumber', { number: item.number })}, ${label}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 16,
                minHeight: 64,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              {status === 'won' ? (
                <Check size={18} color={color} />
              ) : status === 'lost' ? (
                <X size={18} color={color} />
              ) : (
                <Circle size={18} color={color} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                  {t('puzzleNumber', { number: item.number })}
                </Text>
                <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 2 }}>
                  {item.date} · {label}
                </Text>
              </View>
              <ForwardChevron color={theme.textMuted} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
