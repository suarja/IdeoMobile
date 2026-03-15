import { useSSO } from '@clerk/expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type OAuthStrategy = 'oauth_google' | 'oauth_apple' | 'oauth_github';

const SSO_PROVIDERS: { strategy: OAuthStrategy; label: string }[] = [
  { strategy: 'oauth_google', label: 'Continue with Google' },
  { strategy: 'oauth_apple', label: 'Continue with Apple' },
  { strategy: 'oauth_github', label: 'Continue with GitHub' },
];

export default function SignInPage() {
  const { startSSOFlow } = useSSO();

  const handleSSO = async (strategy: OAuthStrategy) => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: Linking.createURL('/'),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    }
    catch (e) {
      console.error('SSO error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Ideo</Text>
        <Text style={styles.subtitle}>
          Turn your idea into a structured blueprint in under 3 minutes.
        </Text>
      </View>

      <View style={styles.buttons}>
        {SSO_PROVIDERS.map(({ strategy, label }) => (
          <Pressable
            key={strategy}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => { void handleSSO(strategy); }}
          >
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAEA',
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 48,
  },
  header: {
    gap: 12,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#433831',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B5B4E',
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  button: {
    backgroundColor: '#433831',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#FCFAEA',
    fontSize: 16,
    fontWeight: '600',
  },
});
