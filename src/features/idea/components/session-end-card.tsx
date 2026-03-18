import type { SessionEndData } from '../use-idea-session';
import { Ionicons } from '@expo/vector-icons';

import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors, Text, View } from '@/components/ui';

type Props = {
  data: SessionEndData;
  pointsEarned?: number;
  onClose: () => void;
};

export function SessionEndCard({ data, pointsEarned, onClose }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Session terminée</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={colors.brand.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Résumé</Text>
      <Text style={styles.summary}>{data.summary}</Text>

      {data.objectives.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{`Objectifs (${data.objectives.length})`}</Text>
          {data.objectives.map((obj, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listBullet}>☐</Text>
              <Text style={styles.listText}>{obj}</Text>
            </View>
          ))}
        </>
      )}

      {data.nextSteps.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Prochaines étapes</Text>
          {data.nextSteps.map((step, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listBullet}>→</Text>
              <Text style={styles.listText}>{step}</Text>
            </View>
          ))}
        </>
      )}

      {pointsEarned !== undefined && (
        <>
          <View style={styles.divider} />
          <Text style={styles.points}>{`🏆 +${pointsEarned} pts`}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brand.card,
    borderColor: colors.brand.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    marginHorizontal: 24,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerText: {
    color: colors.brand.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    backgroundColor: colors.brand.border,
    height: 1,
    marginVertical: 10,
  },
  sectionLabel: {
    color: '#A08060',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  summary: {
    color: colors.brand.dark,
    fontSize: 13,
    lineHeight: 20,
  },
  listRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  listBullet: {
    color: colors.brand.muted,
    fontSize: 13,
    width: 16,
  },
  listText: {
    color: colors.brand.dark,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  points: {
    color: '#C4773B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
