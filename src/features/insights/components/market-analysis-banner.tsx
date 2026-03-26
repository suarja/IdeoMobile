import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import type { Artifact } from '../api';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui';
import { translate } from '@/lib/i18n';

type MarketJob = Doc<'marketAnalysisJobs'>;

type Props = {
  projectId: Id<'projects'>;
  job: MarketJob | null | undefined;
  marketArtifact: Artifact | null | undefined;
  onLaunch: () => void;
  onView: (artifact: Artifact) => void;
};

export function MarketAnalysisBanner({ job, marketArtifact, onLaunch, onView }: Props) {
  // done state
  if (job?.status === 'done' && marketArtifact) {
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <Text style={styles.label}>{translate('insights.market_done_label' as any)}</Text>
          <TouchableOpacity onPress={() => onView(marketArtifact)} style={styles.button}>
            <Text style={styles.buttonText}>{translate('insights.market_view' as any)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // running/pending state
  if (job && (job.status === 'running' || job.status === 'pending')) {
    const progress = job.stepsTotal > 0 ? job.stepsDone / job.stepsTotal : 0;
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <ActivityIndicator size="small" color="#433831" style={{ marginRight: 8 }} />
          <Text style={styles.stepLabel} numberOfLines={1}>
            {job.currentStep}
          </Text>
          <Text style={styles.stepCount}>
            {job.stepsDone}
            /
            {job.stepsTotal}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    );
  }

  // error state
  if (job?.status === 'error') {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <View style={styles.row}>
          <Text style={[styles.label, { flex: 1 }]}>{translate('insights.market_error' as any)}</Text>
          <TouchableOpacity onPress={onLaunch} style={styles.button}>
            <Text style={styles.buttonText}>{translate('insights.market_retry' as any)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // available (no job or completed with no artifact yet)
  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{translate('insights.market_available_title' as any)}</Text>
          <Text style={styles.subtitle}>{translate('insights.market_available_subtitle' as any)}</Text>
        </View>
        <TouchableOpacity onPress={onLaunch} style={styles.button}>
          <Text style={styles.buttonText}>{translate('insights.market_launch' as any)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDF4CD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DBA8',
  },
  bannerError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#433831',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B5B4E',
    marginTop: 2,
  },
  stepLabel: {
    fontSize: 13,
    color: '#433831',
    flex: 1,
  },
  stepCount: {
    fontSize: 12,
    color: '#6B5B4E',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#433831',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E8DBA8',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#433831',
    borderRadius: 2,
  },
});
