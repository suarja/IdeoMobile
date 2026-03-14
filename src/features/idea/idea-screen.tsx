import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { translate } from '@/lib/i18n';

export function IdeaScreen() {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: '#FCFAEA' }}
    >
      <FocusAwareStatusBar />
      <TouchableOpacity onPress={() => {}} activeOpacity={0.8} style={styles.micWrapper}>
        <BlurView tint="light" intensity={80} style={styles.micButton}>
          <Ionicons name="mic" size={48} color="#433831" />
        </BlurView>
      </TouchableOpacity>
      <Text
        className="mt-8 text-center text-2xl font-semibold"
        style={{ color: '#433831' }}
      >
        {translate('idea.cta')}
      </Text>
      <Text
        className="mt-2 px-8 text-center text-base"
        style={{ color: '#7D7D7D' }}
      >
        {translate('idea.subtitle')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  micButton: {
    alignItems: 'center',
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 120,
  },
  micWrapper: {
    borderColor: 'rgba(67, 56, 49, 0.15)',
    borderRadius: 60,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#433831',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});
