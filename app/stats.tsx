import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { winPercentage, isStreakBroken } from '../src/game/streak';
import { localDateString } from '../src/game/selection';
import { MAX_ATTEMPTS } from '../src/game/types';
import { AdBanner } from '../src/components/AdBanner';
import { t } from '../src/i18n';

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text }}>{value}</Text>
      <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 4 }}>{label}</Text>
    </View>
  );
};

export default function StatsScreen() {
  const theme = useTheme();
  const stats = useGameStore((s) => s.stats);
  const today = localDateString();
  const liveStreak = isStreakBroken(stats.lastPlayedDate, today) ? 0 : stats.currentStreak;
  const most = Math.max(1, ...stats.distribution);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label={t('statsPlayedLabel')} value={String(stats.played)} />
          <Metric label={t('winRate')} value={`${winPercentage(stats)}%`} />
          <Metric label={t('statsCurrentStreak')} value={String(liveStreak)} />
          <Metric label={t('statsBestStreak')} value={String(stats.maxStreak)} />
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 18,
            padding: 18,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
            {t('distributionTitle')}
          </Text>

          {stats.played === 0 ? (
            <Text style={{ fontSize: 13.5, color: theme.textSecondary, lineHeight: 19 }}>
              {t('noStatsYet')}
            </Text>
          ) : (
            Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
              const count = stats.distribution[i] ?? 0;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text
                    style={{ width: 14, fontSize: 13, fontWeight: '700', color: theme.textSecondary }}
                  >
                    {i + 1}
                  </Text>
                  <View
                    accessible
                    accessibilityLabel={`${i + 1}: ${count}`}
                    style={{
                      flex: 1,
                      height: 26,
                      borderRadius: 6,
                      backgroundColor: theme.background,
                      overflow: 'hidden',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.max(count ? 12 : 0, (count / most) * 100)}%`,
                        height: '100%',
                        backgroundColor: count ? theme.tileCorrect : 'transparent',
                        borderRadius: 6,
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        paddingHorizontal: 8,
                      }}
                    >
                      {count > 0 && (
                        <Text style={{ color: theme.onTile, fontSize: 12, fontWeight: '800' }}>
                          {count}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}
