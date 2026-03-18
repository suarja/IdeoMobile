import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const TAB_BAR_WIDTH = 330;
const TAB_BAR_HEIGHT = 72;

type TabConfig = {
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  inactiveIcon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: { activeIcon: 'mic', inactiveIcon: 'mic-outline', label: 'Idea' },
  focus: { activeIcon: 'flame', inactiveIcon: 'flame-outline', label: 'Focus' },
  settings: { activeIcon: 'person', inactiveIcon: 'person-outline', label: 'Me' },
};

export function MetalOrangeTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name] ?? {
            activeIcon: 'ellipse' as const,
            inactiveIcon: 'ellipse-outline' as const,
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const hasBadge = route.name === 'focus' && !!descriptors[route.key].options.tabBarBadge;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons
                  name={isFocused ? config.activeIcon : config.inactiveIcon}
                  size={22}
                  color={colors.brand.bg}
                  style={{ opacity: isFocused ? 1 : 0.45 }}
                />
                {hasBadge && <View style={styles.badgeDot} />}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: colors.brand.bg },
                  !isFocused && styles.labelInactive,
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 8,
  },
  pill: {
    backgroundColor: colors.brand.dark,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    shadowColor: colors.brand.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    width: TAB_BAR_WIDTH,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  labelInactive: {
    opacity: 0.4,
  },
  badgeDot: {
    backgroundColor: colors.danger[500],
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: -2,
    top: -2,
    width: 8,
    zIndex: 10,
  },
});
