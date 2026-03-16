import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useProjectMemory, useUserMemory } from '@/features/focus/api';
import { useActiveProject } from '@/features/idea/api';
import { translate } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

type MemoryRowProps = {
  memKey: string;
  value: string;
  onDelete: () => void;
  isLast: boolean;
};

function MemoryRow({ memKey, value, onDelete, isLast }: MemoryRowProps) {
  return (
    <View>
      <TouchableOpacity
        onLongPress={() => {
          Alert.alert(translate('settings.memory_delete_confirm'), `${memKey}: ${value}`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]);
        }}
        style={{ paddingVertical: 10 }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.dark }}>{memKey}</Text>
        <Text style={{ fontSize: 13, color: colors.brand.muted, marginTop: 2 }}>{value}</Text>
      </TouchableOpacity>
      {!isLast && <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />}
    </View>
  );
}

function UserMemorySection({ userMemory }: { userMemory: Array<{ key: string; value: string }> }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.brand.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        {translate('settings.user_memory_section')}
      </Text>
      {userMemory.map((m, idx) => (
        <MemoryRow
          key={m.key}
          memKey={m.key}
          value={m.value}
          isLast={idx === userMemory.length - 1}
          onDelete={() => { /* TODO: wire deleteMemory mutation */ }}
        />
      ))}
    </View>
  );
}

type ProjectMemorySectionProps = {
  projectMemory: Array<{ key: string; value: string }>;
  projectName: string;
};

function ProjectMemorySection({ projectMemory, projectName }: ProjectMemorySectionProps) {
  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: colors.brand.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        {translate('settings.project_memory_section')}
        {' — '}
        {projectName}
      </Text>
      {projectMemory.map((m, idx) => (
        <MemoryRow
          key={m.key}
          memKey={m.key}
          value={m.value}
          isLast={idx === projectMemory.length - 1}
          onDelete={() => { /* TODO: wire deleteMemory mutation */ }}
        />
      ))}
    </View>
  );
}

export function MemoryItem() {
  const modal = useModal();
  const activeProject = useActiveProject();
  const userMemory = useUserMemory();
  const projectMemory = useProjectMemory(activeProject ? activeProject.projectId : null);
  const projectName = activeProject?.name ?? translate('settings.no_name_project');
  const hasAnyMemory = (userMemory?.length ?? 0) > 0 || (projectMemory?.length ?? 0) > 0;

  return (
    <>
      <SettingsItem text="settings.agent_memory" onPress={modal.present} />
      <Modal
        ref={modal.ref}
        snapPoints={['75%']}
        backgroundStyle={{ backgroundColor: colors.brand.bg }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '700', color: colors.brand.dark, textAlign: 'center' }}
          >
            {translate('settings.agent_memory')}
          </Text>
        </View>
        <ScrollView style={{ paddingHorizontal: 16, flex: 1 }}>
          {!hasAnyMemory && (
            <Text
              style={{ fontSize: 14, color: colors.brand.muted, textAlign: 'center', marginTop: 24 }}
            >
              {translate('settings.agent_memory_empty')}
            </Text>
          )}
          {(userMemory?.length ?? 0) > 0 && (
            <UserMemorySection userMemory={userMemory!} />
          )}
          {(projectMemory?.length ?? 0) > 0 && (
            <ProjectMemorySection projectMemory={projectMemory!} projectName={projectName} />
          )}
        </ScrollView>
      </Modal>
    </>
  );
}
