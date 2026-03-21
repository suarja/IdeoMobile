import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BellSimple } from 'phosphor-react-native';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { useNotificationContext } from '@/lib/context/notification-context';

type NotificationModalProps = {
  modalRef: React.RefObject<BottomSheetModal | null>;
  onDismiss: () => void;
};

export function NotificationModal({ modalRef, onDismiss }: NotificationModalProps) {
  const { sendTestNotification, isPermissionGranted } = useNotificationContext();

  return (
    <Modal
      ref={modalRef}
      snapPoints={['40%']}
      backgroundStyle={{ backgroundColor: colors.brand.bg }}
      onDismiss={onDismiss}
    >
      <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32, gap: 16 }}>
        <BellSimple size={48} weight="fill" color={colors.brand.dark} />

        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brand.dark }}>
            Test Notification
          </Text>
          <Text style={{ fontSize: 13, color: colors.brand.muted, textAlign: 'center' }}>
            {isPermissionGranted
              ? 'Tap the button to receive a local notification in 1 second.'
              : 'Notification permissions are not granted.'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={async () => {
            if (isPermissionGranted) {
              await sendTestNotification();
            }
            onDismiss();
          }}
          disabled={!isPermissionGranted}
          style={{
            backgroundColor: isPermissionGranted ? colors.brand.dark : colors.brand.border,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.brand.bg }}>
            Send test
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
