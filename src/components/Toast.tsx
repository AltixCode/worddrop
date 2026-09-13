import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

/** Short, non-blocking feedback for a rejected guess. */
export const Toast: React.FC<Props> = ({ message, onDismiss }) => {
  const theme = useTheme();

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 1600);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(140)}
      exiting={FadeOut.duration(160)}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: 8,
        alignSelf: 'center',
        backgroundColor: theme.isDark ? '#F5F7FA' : '#14181F',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        maxWidth: '90%',
      }}
    >
      <Text
        style={{
          color: theme.isDark ? '#14181F' : '#FFFFFF',
          fontWeight: '700',
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
};
