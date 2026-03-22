import type { Id } from '../../../../convex/_generated/dataModel';

import * as React from 'react';
import { Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useListProjects, useSetActiveProject } from '@/features/focus/api';
import { translate } from '@/lib/i18n';
import { useUpdateProjectLinks } from '../api';
import { SettingsItem } from './settings-item';

type ProjectLinks = {
  github: string;
  website: string;
  tiktok: string;
  instagram: string;
};

const PLATFORMS = ['github', 'website', 'tiktok', 'instagram'] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  github: 'GitHub',
  website: 'Website',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

function fromProjectLinks(pl: Record<string, string | undefined | null> | null): ProjectLinks {
  return {
    github: pl?.github ?? '',
    website: pl?.website ?? '',
    tiktok: pl?.tiktok ?? '',
    instagram: pl?.instagram ?? '',
  };
}

function toProjectLinksPayload(local: ProjectLinks) {
  return {
    github: local.github.trim() || undefined,
    website: local.website.trim() || undefined,
    tiktok: local.tiktok.trim() || undefined,
    instagram: local.instagram.trim() || undefined,
  };
}

const INPUT_STYLE = {
  borderWidth: 1,
  borderColor: colors.brand.border,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 13,
  color: colors.brand.dark,
  backgroundColor: colors.brand.bg,
  flex: 1,
} as const;

type LinksFormProps = {
  isActive: boolean;
  initialLinks: ProjectLinks;
  onSetActive: () => void;
  onSave: (links: ProjectLinks) => Promise<void>;
};

function ProjectLinksForm({ isActive, initialLinks, onSetActive, onSave }: LinksFormProps) {
  const [localLinks, setLocalLinks] = React.useState<ProjectLinks>(initialLinks);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    const hasInvalidUrl = PLATFORMS.some((p) => {
      const val = localLinks[p].trim();
      return val.length > 0 && !val.startsWith('https://');
    });
    if (hasInvalidUrl) {
      Alert.alert(translate('settings.social_invalid_url'));
      return;
    }
    setSaving(true);
    try {
      await onSave(localLinks);
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: colors.brand.selected,
        borderTopWidth: 1,
        borderTopColor: colors.brand.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand.muted, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 }}>
        {translate('settings.project_links')}
      </Text>

      {PLATFORMS.map(platform => (
        <View key={platform} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, color: colors.brand.dark, width: 72 }}>
            {PLATFORM_LABELS[platform]}
          </Text>
          <TextInput
            value={localLinks[platform]}
            onChangeText={val => setLocalLinks(prev => ({ ...prev, [platform]: val }))}
            placeholder="https://..."
            placeholderTextColor={colors.brand.muted}
            style={INPUT_STYLE}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {!isActive && (
          <TouchableOpacity
            onPress={onSetActive}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.brand.dark,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.dark }}>
              {translate('settings.set_active')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={saving}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: colors.brand.dark,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.bg }}>
            {translate('settings.save_links')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type ProjectRowProps = {
  project: NonNullable<ReturnType<typeof useListProjects>>[number];
  isExpanded: boolean;
  onToggle: () => void;
  onSetActive: () => void;
  onSaveLinks: (links: ProjectLinks) => Promise<void>;
};

function ProjectRow({ project, isExpanded, onToggle, onSetActive, onSaveLinks }: ProjectRowProps) {
  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {project.isActive && (
              <View style={{ backgroundColor: colors.brand.dark, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
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
        <Text style={{ fontSize: 18, color: colors.brand.muted, marginLeft: 8 }}>
          {isExpanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <ProjectLinksForm
          isActive={project.isActive}
          initialLinks={fromProjectLinks(project.projectLinks)}
          onSetActive={onSetActive}
          onSave={onSaveLinks}
        />
      )}
    </View>
  );
}

export function ProjectsItem() {
  const modal = useModal();
  const projects = useListProjects();
  const setActive = useSetActiveProject();
  const updateLinks = useUpdateProjectLinks();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const activeProject = projects?.find(p => p.isActive);

  const handleToggle = (projectId: Id<'projects'>) => {
    setExpandedId(prev => (prev === String(projectId) ? null : String(projectId)));
  };

  const handleSetActive = async (projectId: Id<'projects'>) => {
    await setActive({ projectId });
    modal.ref.current?.dismiss();
  };

  const handleSaveLinks = async (_projectId: Id<'projects'>, links: ProjectLinks) => {
    await updateLinks({ projectLinks: toProjectLinksPayload(links) });
  };

  return (
    <>
      <SettingsItem
        text="settings.agent_projects"
        value={activeProject?.name ?? translate('settings.no_name_project')}
        onPress={() => {
          setExpandedId(null);
          modal.present();
        }}
      />
      <Modal
        ref={modal.ref}
        snapPoints={['80%']}
        backgroundStyle={{ backgroundColor: colors.brand.bg }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand.dark, textAlign: 'center' }}>
            {translate('settings.agent_projects')}
          </Text>
        </View>
        <View>
          {(projects ?? []).map((project, idx) => (
            <View key={String(project.projectId)}>
              <ProjectRow
                project={project}
                isExpanded={expandedId === String(project.projectId)}
                onToggle={() => handleToggle(project.projectId)}
                onSetActive={() => void handleSetActive(project.projectId)}
                onSaveLinks={links => handleSaveLinks(project.projectId, links)}
              />
              {idx < (projects?.length ?? 0) - 1 && (
                <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 16 }} />
              )}
            </View>
          ))}
        </View>
      </Modal>
    </>
  );
}
