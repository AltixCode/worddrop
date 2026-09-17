import React, { useCallback, useState } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Crown, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { scheduleDailyReminder, cancelDailyReminder } from '../src/services/notifications';
import { showPrivacyOptions, getConsentState } from '../src/services/ads';
import { restorePurchases } from '../src/services/purchases';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../src/config/legal';
import { t } from '../src/i18n';
import { useTabletColumn } from '../src/theme/useTabletColumn';

const REMINDER_TIMES = ['09:00', '12:00', '18:00', '20:00', '21:30'];

const Section: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: theme.textMuted,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
};

const Row: React.FC<
  React.PropsWithChildren<{ title: string; subtitle?: string; onPress?: () => void }>
> = ({ title, subtitle, onPress, children }) => {
  const theme = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 60,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12.5, color: theme.textSecondary, marginTop: 3, lineHeight: 17 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
};

export default function SettingsScreen() {
  const theme = useTheme();

  const tabletColumn = useTabletColumn();
  const router = useRouter();
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const isPro = useGameStore((s) => s.isPro);
  const setIsPro = useGameStore((s) => s.setIsPro);
  const resetEverything = useGameStore((s) => s.resetEverything);
  const [notice, setNotice] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const toggleReminder = useCallback(
    async (enabled: boolean) => {
      setNotice(null);
      if (!enabled) {
        setSettings({ reminderEnabled: false });
        await cancelDailyReminder();
        return;
      }
      const [hour, minute] = settings.reminderTime.split(':').map(Number);
      const outcome = await scheduleDailyReminder(
        hour,
        minute,
        t('reminderTitle'),
        t('reminderBody'),
      );
      if (outcome === 'scheduled') {
        setSettings({ reminderEnabled: true });
      } else {
        setSettings({ reminderEnabled: false });
        setNotice(outcome === 'permission_denied' ? t('reminderDenied') : t('reminderFailed'));
      }
    },
    [setSettings, settings.reminderTime],
  );

  const pickTime = useCallback(
    async (time: string) => {
      setSettings({ reminderTime: time });
      if (!settings.reminderEnabled) return;
      const [hour, minute] = time.split(':').map(Number);
      const outcome = await scheduleDailyReminder(
        hour,
        minute,
        t('reminderTitle'),
        t('reminderBody'),
      );
      if (outcome !== 'scheduled') {
        setSettings({ reminderEnabled: false });
        setNotice(outcome === 'permission_denied' ? t('reminderDenied') : t('reminderFailed'));
      }
    },
    [setSettings, settings.reminderEnabled],
  );

  const onRestore = useCallback(async () => {
    const outcome = await restorePurchases();
    if (outcome.status === 'unlocked') {
      setIsPro(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotice(null);
      return;
    }
    setNotice(
      outcome.status === 'no_entitlement'
        ? t('noPriorPurchases')
        : outcome.status === 'store_unavailable'
          ? t('storeUnavailable')
          : t('purchaseFailed'),
    );
  }, [setIsPro]);

  const confirmReset = useCallback(() => {
    Alert.alert(t('resetConfirmTitle'), t('resetConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('resetConfirm'),
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          resetEverything();
        },
      },
    ]);
  }, [resetEverything]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 , ...tabletColumn }}>
        {notice && (
          <Text style={{ color: theme.danger, fontSize: 13.5, lineHeight: 19 }}>{notice}</Text>
        )}

        <Section title={t('settingsGame')}>
          <Row title={t('highContrast')} subtitle={t('highContrastDesc')}>
            <Switch
              value={settings.highContrast}
              onValueChange={(v) => setSettings({ highContrast: v })}
              accessibilityLabel={t('highContrast')}
            />
          </Row>
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Row title={t('hapticsLabel')} subtitle={t('hapticsDesc')}>
            <Switch
              value={settings.haptics}
              onValueChange={(v) => setSettings({ haptics: v })}
              accessibilityLabel={t('hapticsLabel')}
            />
          </Row>
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Row title={t('reminderLabel')} subtitle={t('reminderDesc')}>
            <Switch
              value={settings.reminderEnabled}
              onValueChange={toggleReminder}
              accessibilityLabel={t('reminderLabel')}
            />
          </Row>
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
              {t('reminderTimeLabel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {REMINDER_TIMES.map((time) => {
                const active = settings.reminderTime === time;
                return (
                  <Pressable
                    key={time}
                    onPress={() => pickTime(time)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={time}
                    style={{
                      minHeight: 44,
                      justifyContent: 'center',
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primaryMuted : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: active ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title={t('settingsPurchase')}>
          {isPro ? (
            <Row title={t('proActive')} subtitle={t('proActiveDesc')}>
              <Crown size={18} color={theme.warning} />
            </Row>
          ) : (
            <>
              <Row
                title={t('lifetimeAccessPlain')}
                subtitle={t('adsDisclosure')}
                onPress={() => router.push('/paywall')}
              >
                <Crown size={18} color={theme.warning} />
              </Row>
              <View style={{ height: 1, backgroundColor: theme.border }} />
              {getConsentState().privacyOptionsRequired && (
                <>
                  <Row
                    title={t('privacyOptions')}
                    subtitle={t('privacyOptionsDesc')}
                    onPress={showPrivacyOptions}
                  >
                    <ShieldCheck size={18} color={theme.textMuted} />
                  </Row>
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                </>
              )}
            </>
          )}
          <Row title={t('restorePurchases')} onPress={onRestore} />
        </Section>

        <Section title={t('settingsLegal')}>
          <Row title={t('privacyPolicy')} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <ExternalLink size={16} color={theme.textMuted} />
          </Row>
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Row title={t('termsOfUse')} onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
            <ExternalLink size={16} color={theme.textMuted} />
          </Row>
        </Section>

        <Section title={t('settingsAbout')}>
          <Row title={t('versionLabel', { version })} />
          <View style={{ height: 1, backgroundColor: theme.border }} />
          <Row title={t('resetData')} subtitle={t('resetDataDesc')} onPress={confirmReset}>
            <Trash2 size={17} color={theme.danger} />
          </Row>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
