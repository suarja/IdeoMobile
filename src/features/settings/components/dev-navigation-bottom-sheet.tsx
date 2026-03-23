import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { useCallback } from 'react';
import { View } from 'react-native';

import { colors, Text, TouchableOpacity } from '@/components/ui';
import { Modal } from '@/components/ui/modal';

type NavRoute = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const ROUTES: NavRoute[] = [
  {
    label: 'Landing Page',
    route: '/onboarding',
    icon: 'home-outline',
    description: 'Écran de bienvenue (mic hero)',
  },
  {
    label: 'Sign In',
    route: '/sign-in',
    icon: 'log-in-outline',
    description: 'Authentification SSO',
  },
  {
    label: 'Idea (main)',
    route: '/(app)/',
    icon: 'mic-outline',
    description: 'Écran principal — agent IA',
  },
  {
    label: 'Focus',
    route: '/(app)/focus',
    icon: 'trophy-outline',
    description: 'Gamification — niveaux, défis',
  },
  {
    label: 'Insights',
    route: '/(app)/insights',
    icon: 'bar-chart-outline',
    description: 'Statistiques et analytics',
  },
  {
    label: 'Settings',
    route: '/(app)/settings',
    icon: 'settings-outline',
    description: 'Profil et préférences',
  },
];

export function DevNavigationBottomSheet({ modalRef }: { modalRef: React.RefObject<BottomSheetModal | null> }) {
  const router = useRouter();

  const handleNavigate = useCallback((route: string) => {
    modalRef.current?.dismiss();
    router.push(route as any);
  }, [modalRef, router]);

  const renderItem = useCallback(({ item }: { item: NavRoute }) => {
    return (
      <TouchableOpacity
        onPress={() => handleNavigate(item.route)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: `${colors.brand.border}60`,
          gap: 14,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: colors.brand.selected,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={item.icon} size={18} color={colors.brand.dark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark }}>
            {item.label}
          </Text>
          <Text style={{ fontSize: 12, color: colors.brand.muted, marginTop: 1 }}>
            {item.route}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brand.muted} />
      </TouchableOpacity>
    );
  }, [handleNavigate]);

  return (
    <Modal
      ref={modalRef}
      snapPoints={['55%', '80%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
    >
      <View style={{ flex: 1, paddingTop: 4, paddingBottom: 32 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 12,
            gap: 8,
          }}
        >
          <Ionicons name="map-outline" size={16} color={colors.brand.muted} />
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.brand.muted, textTransform: 'uppercase' }}>
            Navigation rapide
          </Text>
        </View>
        <BottomSheetFlatList
          data={ROUTES}
          keyExtractor={item => item.route}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}
