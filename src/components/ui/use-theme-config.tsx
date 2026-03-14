import type { Theme } from '@react-navigation/native';
import { DefaultTheme } from '@react-navigation/native';

import colors from '@/components/ui/colors';

const MetalOrangeTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary[600],
    background: colors.brand.bg,
    text: colors.brand.dark,
    border: colors.brand.border,
    card: colors.brand.card,
  },
};

export function useThemeConfig() {
  return MetalOrangeTheme;
}
