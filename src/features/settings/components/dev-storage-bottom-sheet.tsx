import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { colors, Text, TouchableOpacity } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { storage } from '@/lib/storage';

export function DevStorageBottomSheet({ modalRef }: { modalRef: React.RefObject<BottomSheetModal | null> }) {
  const [keys, setKeys] = useState<string[]>([]);

  const refreshKeys = useCallback(() => {
    setKeys(storage.getAllKeys());
  }, []);

  // Refresh keys when modal opens
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeys(storage.getAllKeys());
  }, []);

  const handleDelete = (key: string) => {
    storage.delete(key);
    refreshKeys();
  };

  const handleClearAll = () => {
    storage.clearAll();
    refreshKeys();
  };

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      let value = '---';
      try {
        // Attempt to read as string
        const s = storage.getString(item);
        if (s !== undefined) {
          value = s;
        }
        else {
          const b = storage.getBoolean(item);
          if (b !== undefined) {
            value = String(b);
          }
          else {
            const n = storage.getNumber(item);
            if (n !== undefined)
              value = String(n);
          }
        }
      }
      catch (_e) {
        console.warn(`Failed to read key ${item} as string, boolean, or number: ${_e}`);
      }

      return (
        <View className="flex-row items-center justify-between border-b p-4" style={{ borderColor: colors.brand.border }}>
          <View className="mr-4 flex-1">
            <Text className="text-sm font-bold" style={{ color: colors.brand.dark }} numberOfLines={1}>
              {item}
            </Text>
            <Text className="text-xs" style={{ color: colors.brand.muted }} numberOfLines={1}>
              {value}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      );
    },
    [handleDelete],
  );

  return (
    <Modal ref={modalRef} snapPoints={['60%', '90%']} backgroundStyle={{ backgroundColor: colors.brand.bg }}>
      <View className="flex-1 px-4 py-2 pb-8">
        <View className="mb-4 flex-row items-center justify-between px-2">
          <Text className="text-lg font-bold" style={{ color: colors.brand.dark }}>
            Storage Manager
          </Text>
          <TouchableOpacity onPress={handleClearAll} style={{ padding: 4 }}>
            <Text className="text-sm font-medium" style={{ color: '#EF4444' }}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
        <BottomSheetFlatList
          data={keys}
          keyExtractor={item => item}
          renderItem={renderItem}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center pt-20">
              <Text style={{ color: colors.brand.muted }}>No keys found</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}
