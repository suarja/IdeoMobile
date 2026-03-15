import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { colors, Text, View } from '@/components/ui';

type Props = {
  children: React.ReactNode;
  title?: TxKeyPath;
};

export function SettingsContainer({ children, title }: Props) {
  const childArray = React.Children.toArray(children);

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
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: colors.brand.card,
          borderWidth: 1,
          borderColor: colors.brand.border,
        }}
      >
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < childArray.length - 1 && (
              <View
                style={{
                  height: 1,
                  marginHorizontal: 16,
                  backgroundColor: 'rgba(0,0,0,0.06)',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </>
  );
}
