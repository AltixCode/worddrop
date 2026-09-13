import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Crown } from 'lucide-react-native';
import { initPurchases, checkIsPro } from '../src/services/purchases';
import { initAds } from '../src/services/ads';
import { useGameStore } from '../src/store/useGameStore';
import { useTheme } from '../src/theme/useTheme';
import { t } from '../src/i18n';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();
  const theme = useTheme();
  const isPro = useGameStore((s) => s.isPro);
  const setIsPro = useGameStore((s) => s.setIsPro);

  useEffect(() => {
    // Both run in the background: the first frame must never wait on the store
    // or on an ad SDK handshake.
    let cancelled = false;
    initPurchases();
    checkIsPro().then((pro) => {
      if (cancelled) return;
      setIsPro(pro);
      initAds(pro);
    });
    return () => {
      cancelled = true;
    };
  }, [setIsPro]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.statusBarStyle} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '800', color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          headerRight: () =>
            isPro ? null : (
              <Pressable
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
                accessibilityLabel={t('paywallTitle')}
                hitSlop={12}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
              >
                <Crown size={15} color={theme.warning} />
                <Text
                  style={{
                    color: theme.warning,
                    fontSize: 12,
                    fontWeight: '800',
                    marginStart: 6,
                  }}
                >
                  {t('proBadge')}
                </Text>
              </Pressable>
            ),
        }}
      >
        <Stack.Screen name="index" options={{ title: t('appName'), headerTitleAlign: 'left' }} />
        <Stack.Screen name="game" options={{ title: t('gameTitle'), headerBackTitle: t('back') }} />
        <Stack.Screen
          name="result"
          options={{ title: t('appName'), presentation: 'modal', headerRight: () => null }}
        />
        <Stack.Screen name="stats" options={{ title: t('statsTitle'), headerBackTitle: t('back') }} />
        <Stack.Screen
          name="archive"
          options={{ title: t('archiveTitle'), headerBackTitle: t('back') }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: t('settingsTitle'), headerBackTitle: t('back') }}
        />
        <Stack.Screen
          name="paywall"
          options={{ title: t('paywallTitle'), presentation: 'modal', headerRight: () => null }}
        />
      </Stack>
    </View>
  );
}
