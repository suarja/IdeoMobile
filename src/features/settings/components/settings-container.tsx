import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { colors, Text, View } from '@/components/ui';

type Props = {
  children: React.ReactNode;
  title?: TxKeyPath;
};

export function SettingsContainer({ children, title }: Props) {
  return (
    <>
      {title && (
        <Text
          className="pt-4 pb-2 text-lg font-semibold"
          style={{ color: colors.brand.dark }}
          tx={title}
        />
      )}
      <View
        className="rounded-xl"
        style={{
          backgroundColor: colors.brand.card,
          borderWidth: 1,
          borderColor: colors.brand.border,
        }}
      >
        {children}
      </View>
    </>
  );
}
