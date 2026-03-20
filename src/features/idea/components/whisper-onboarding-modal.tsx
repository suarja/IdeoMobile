import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { translate } from '@/lib/i18n';

type WhisperOnboardingModalProps = {
  visible: boolean;
  onContinue: () => void;
};

export function WhisperOnboardingModal({ visible, onContinue }: WhisperOnboardingModalProps) {
  const { ref, present, dismiss } = useModal();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => present(), 100);
      return () => clearTimeout(timer);
    }
    else {
      dismiss();
    }
  }, [visible, present, dismiss]);

  return (
    <Modal
      ref={ref}
      snapPoints={['50%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mic-outline" size={28} color={colors.brand.bg} />
        </View>

        <Text style={styles.title}>{translate('settings.whisper_onboarding_title')}</Text>

        <Text style={styles.body}>{translate('settings.whisper_onboarding_body1')}</Text>

        <Text style={styles.body}>{translate('settings.whisper_onboarding_body2')}</Text>

        <TouchableOpacity style={styles.cta} onPress={onContinue} activeOpacity={0.8}>
          <Text style={styles.ctaText}>{translate('settings.whisper_onboarding_cta')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: 56,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginBottom: 20,
    width: 60,
  },
  title: {
    color: colors.brand.dark,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  body: {
    color: colors.brand.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.brand.dark,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 16,
    width: '100%',
  },
  ctaText: {
    color: colors.brand.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});
