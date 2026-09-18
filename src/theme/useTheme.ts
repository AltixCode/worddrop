import { useColorScheme } from 'react-native';
import { useGameStore } from '../store/useGameStore';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  primaryBorder: string;
  onPrimary: string;
  accent: string;
  warning: string;
  danger: string;
  success: string;
  /** Board colours. */
  tileEmpty: string;
  tileEmptyBorder: string;
  tilePending: string;
  tilePendingBorder: string;
  tileCorrect: string;
  tilePresent: string;
  tileAbsent: string;
  onTile: string;
  keyBackground: string;
  keyText: string;
  /** For a surface that deliberately inverts the appearance, such as a toast. */
  inverseSurface: string;
  onInverseSurface: string;
  headerBackground: string;
  statusBarStyle: 'light' | 'dark';
}

/**
 * Every colour in the app comes from here.
 *
 * Both appearances must be correct, so `userInterfaceStyle` stays `automatic`
 * and no screen hardcodes a hex value or a coloured Tailwind class: a palette
 * tuned against a dark ground drops to roughly 2:1 on a light card, well under
 * WCAG AA. The board's three feedback colours therefore carry separate
 * light-mode values, and separate high-contrast values again for players who
 * cannot tell the green and yellow apart.
 */
export const useTheme = (): ThemeColors => {
  const scheme = useColorScheme();
  const highContrast = useGameStore((s) => s.settings.highContrast);
  const isDark = scheme === 'dark';

  const correct = highContrast
    ? isDark
      ? '#E07B39'
      : '#C2570E'
    : isDark
      ? '#3FA96A'
      : '#2E8B57';
  const present = highContrast
    ? isDark
      ? '#3B82F6'
      : '#2563EB'
    : isDark
      ? '#D0A32E'
      : '#B4881B';

  return {
    isDark,
    background: isDark ? '#0B0F16' : '#F7F7F5',
    surface: isDark ? '#141A24' : '#FFFFFF',
    surfaceRaised: isDark ? '#1B2330' : '#FFFFFF',
    border: isDark ? '#26303F' : '#E4E4E0',
    text: isDark ? '#F5F7FA' : '#14181F',
    textSecondary: isDark ? '#9BA7B8' : '#4B5563',
    textMuted: isDark ? '#67748A' : '#8A94A3',
    primary: isDark ? '#5B8CFF' : '#2C5CE6',
    primaryMuted: isDark ? 'rgba(91, 140, 255, 0.14)' : 'rgba(44, 92, 230, 0.08)',
    primaryBorder: isDark ? 'rgba(91, 140, 255, 0.32)' : 'rgba(44, 92, 230, 0.22)',
    onPrimary: '#FFFFFF',
    accent: isDark ? '#C084FC' : '#7E22CE',
    warning: isDark ? '#F0B429' : '#A9690A',
    danger: isDark ? '#F87171' : '#C62F2F',
    success: correct,
    tileEmpty: 'transparent',
    // `tileEmpty` is transparent, so this border IS the tile: before a letter
    // is typed, an empty row is nothing but six of these outlines. It was
    // #2A3444 at 1.53:1 against the dark background and #D8D8D2 at 1.33:1
    // against the light one, which is why the live iPad screenshot has a
    // third of the frame indistinguishable from its own background. WCAG AA
    // asks 3:1 for the boundary of a non-text component; these are 3.35:1
    // and 3.16:1.
    tileEmptyBorder: isDark ? '#59677E' : '#8C8C84',
    tilePending: isDark ? '#1B2330' : '#FFFFFF',
    tilePendingBorder: isDark ? '#4A5769' : '#9AA2AE',
    tileCorrect: correct,
    tilePresent: present,
    tileAbsent: isDark ? '#39414F' : '#8D939C',
    onTile: '#FFFFFF',
    keyBackground: isDark ? '#232D3B' : '#DFE1E4',
    keyText: isDark ? '#F5F7FA' : '#14181F',
    inverseSurface: isDark ? '#F5F7FA' : '#14181F',
    onInverseSurface: isDark ? '#14181F' : '#FFFFFF',
    headerBackground: isDark ? '#0B0F16' : '#F7F7F5',
    statusBarStyle: isDark ? 'light' : 'dark',
  };
};
