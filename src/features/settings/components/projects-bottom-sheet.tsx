import { TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useListProjects, useSetActiveProject } from '@/features/focus/api';
import { translate } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

export function ProjectsItem() {
  const modal = useModal();
  const projects = useListProjects();
  const setActive = useSetActiveProject();

  const activeProject = projects?.find(p => p.isActive);

  return (
    <>
      <SettingsItem
        text="settings.agent_projects"
        value={activeProject?.name ?? translate('settings.no_name_project')}
        onPress={modal.present}
      />
      <Modal
        ref={modal.ref}
        snapPoints={['60%']}
        backgroundStyle={{ backgroundColor: colors.brand.bg }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '700', color: colors.brand.dark, textAlign: 'center' }}
          >
            {translate('settings.agent_projects')}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {(projects ?? []).map((project, idx) => (
            <View key={String(project.projectId)}>
              <TouchableOpacity
                style={{
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={async () => {
                  await setActive({ projectId: project.projectId });
                  modal.ref.current?.close();
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {project.isActive && (
                      <View
                        style={{
                          backgroundColor: colors.brand.dark,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand.bg }}>
                          {translate('settings.active_badge')}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark }}>
                      {project.name ?? translate('settings.no_name_project')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.brand.muted, marginTop: 2 }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              {idx < (projects?.length ?? 0) - 1 && (
                <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
              )}
            </View>
          ))}
        </View>
      </Modal>
    </>
  );
}
