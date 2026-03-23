import { useRouter } from 'expo-router';
import { Microphone } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsFirstTime } from '@/lib/hooks';

export function OnboardingScreen() {
  const [_, setIsFirstTime] = useIsFirstTime();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.hero}>
        <View style={styles.micButton}>
          <Microphone weight="fill" size={36} color="#FCFAEA" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Ideo</Text>
          <Text style={styles.tagline}>Parle. On structure.</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => {
            setIsFirstTime(false);
            router.replace('/sign-in');
          }}
        >
          <Text style={styles.ctaText}>Commencer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAEA',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 28,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#433831',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#433831',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#A08060',
  },
  tagline: {
    fontSize: 16,
    color: '#433831',
    opacity: 0.65,
    letterSpacing: 0.3,
  },
  bottom: {},
  cta: {
    backgroundColor: '#433831',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.75,
  },
  ctaText: {
    color: '#FCFAEA',
    fontSize: 16,
    fontWeight: '700',
  },
});
