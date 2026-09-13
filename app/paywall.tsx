import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BadgeCheck, Ban, Library, Smartphone, Infinity as InfinityIcon } from 'lucide-react-native';
import { usePaywall } from '../src/hooks/usePaywall';
import { useTheme } from '../src/theme/useTheme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../src/config/legal';
import { t } from '../src/i18n';

const Feature: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
  icon,
  title,
  desc,
}) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 36,
          height: 36,
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
        <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 3, lineHeight: 18 }}>
          {desc}
        </Text>
      </View>
    </View>
  );
};

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { ctaLabel, loading, errorMsg, handlePurchase, handleRestore } = usePaywall(() =>
    router.back(),
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }}>
        <View
          style={{
            backgroundColor: theme.primaryMuted,
            borderColor: theme.primaryBorder,
            borderWidth: 1,
            borderRadius: 20,
            padding: 18,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={18} color={theme.primary} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary }}>
              {t('antiSubTitle')}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 25,
              fontWeight: '700',
              color: theme.text,
              letterSpacing: -0.2,
            }}
          >
            {t('antiSubHeadline')}
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          <Feature
            icon={<Ban size={18} color={theme.primary} />}
            title={t('feat1Title')}
            desc={t('feat1Desc')}
          />
          <Feature
            icon={<Library size={18} color={theme.primary} />}
            title={t('feat2Title')}
            desc={t('feat2Desc')}
          />
          <Feature
            icon={<Smartphone size={18} color={theme.primary} />}
            title={t('feat3Title')}
            desc={t('feat3Desc')}
          />
          <Feature
            icon={<InfinityIcon size={18} color={theme.primary} />}
            title={t('feat4Title')}
            desc={t('feat4Desc')}
          />
        </View>

        {errorMsg && (
          <Text style={{ color: theme.danger, fontSize: 13.5, lineHeight: 19 }}>{errorMsg}</Text>
        )}

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            accessibilityState={{ disabled: loading }}
            style={({ pressed }) => ({
              backgroundColor: theme.primary,
              borderRadius: 16,
              minHeight: 56,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={{ color: theme.onPrimary, fontSize: 16, fontWeight: '800' }}>
                {ctaLabel}
              </Text>
            )}
          </Pressable>

          <Text style={{ fontSize: 12.5, color: theme.textSecondary, textAlign: 'center' }}>
            {t('oneTimePayment')}
          </Text>

          <Pressable
            onPress={handleRestore}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('restorePurchases')}
            style={({ pressed }) => ({
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: theme.primary, fontSize: 14.5, fontWeight: '700' }}>
              {t('restorePurchases')}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 18,
            paddingTop: 4,
          }}
        >
          <Pressable
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            hitSlop={10}
          >
            <Text style={{ color: theme.textMuted, fontSize: 12.5, textDecorationLine: 'underline' }}>
              {t('termsOfUse')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            hitSlop={10}
          >
            <Text style={{ color: theme.textMuted, fontSize: 12.5, textDecorationLine: 'underline' }}>
              {t('privacyPolicy')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
