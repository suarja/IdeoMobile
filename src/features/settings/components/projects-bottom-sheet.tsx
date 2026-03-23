import type { Id } from '../../../../convex/_generated/dataModel';

import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Alert, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, Text } from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { useListProjects, useSetActiveProject } from '@/features/focus/api';
import { useCreateProject } from '@/features/idea/api';
import { translate } from '@/lib/i18n';
import { useUpdateProjectLinks, useUpdateProjectName } from '../api';
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
  paddingHorizontal: 14,
  paddingVertical: 14,
  minHeight: 48,
  fontSize: 15,
  backgroundColor: '#FFFFFF',
  flex: 1,
} as const;

const TEXT_INPUT_COLOR = '#433831';

const SEPARATOR_STYLE = {
  height: 1,
  backgroundColor: 'rgba(0,0,0,0.06)',
  marginHorizontal: 16,
} as const;

type ExpandedFormProps = {
  projectId: Id<'projects'>;
  initialName: string;
  initialLinks: ProjectLinks;
  onSave: (name: string, links: ProjectLinks) => Promise<void>;
};

function ProjectExpandedForm({
  initialName,
  initialLinks,
  onSave,
}: ExpandedFormProps) {
  const [localName, setLocalName] = React.useState(initialName);
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
      await onSave(localName.trim(), localLinks);
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
        {translate('settings.project_name_label')}
      </Text>
      <TextInput
        value={localName}
        onChangeText={setLocalName}
        placeholder={translate('settings.project_name_placeholder')}
        placeholderTextColor={colors.brand.muted}
        style={[INPUT_STYLE, { color: TEXT_INPUT_COLOR }]}
        autoCapitalize="none"
      />

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
            style={[INPUT_STYLE, { color: TEXT_INPUT_COLOR }]}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
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
  onSave: (name: string, links: ProjectLinks) => Promise<void>;
};

function ProjectRow({ project, isExpanded, onToggle, onSetActive, onSave }: ProjectRowProps) {
  return (
    <View style={project.isActive ? { backgroundColor: colors.brand.selected } : undefined}>
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark }}>
              {project.name ?? translate('settings.no_name_project')}
            </Text>
            {project.isActive && (
              <View style={{ backgroundColor: colors.brand.dark, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.brand.bg }}>
                  {translate('settings.active_badge')}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.brand.muted, marginTop: 2 }}>
            {new Date(project.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {!project.isActive && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSetActive();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.brand.dark,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.dark }}>
                {translate('settings.set_active')}
              </Text>
            </TouchableOpacity>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.brand.muted}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ProjectExpandedForm
          projectId={project.projectId}
          initialName={project.name ?? ''}
          initialLinks={fromProjectLinks(project.projectLinks)}
          onSave={onSave}
        />
      )}
    </View>
  );
}

type NewProjectRowProps = {
  onCreated: () => void;
};

function NewProjectRow({ onCreated }: NewProjectRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [name, setName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const createProject = useCreateProject();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed)
      return;
    setCreating(true);
    try {
      await createProject({ name: trimmed });
      setName('');
      setExpanded(false);
      onCreated();
    }
    finally {
      setCreating(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(prev => !prev)}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.dark }}>
          {translate('settings.new_project_button')}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.brand.muted}
        />
      </TouchableOpacity>

      {expanded && (
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
            {translate('settings.project_name_label')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={translate('settings.project_name_placeholder')}
            placeholderTextColor={colors.brand.muted}
            style={[INPUT_STYLE, { color: TEXT_INPUT_COLOR }]}
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity
            onPress={() => void handleCreate()}
            disabled={creating || !name.trim()}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: colors.brand.dark,
              alignItems: 'center',
              opacity: creating || !name.trim() ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.bg }}>
              {translate('settings.create_project_button')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function ProjectsItem() {
  const modal = useModal();
  const projects = useListProjects();
  const setActive = useSetActiveProject();
  const updateLinks = useUpdateProjectLinks();
  const updateName = useUpdateProjectName();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const activeProject = projects?.find(p => p.isActive);

  const handleToggle = (projectId: Id<'projects'>) => {
    setExpandedId(prev => (prev === String(projectId) ? null : String(projectId)));
  };

  const handleSetActive = async (projectId: Id<'projects'>) => {
    await setActive({ projectId });
    modal.ref.current?.dismiss();
  };

  const handleSave = async (projectId: Id<'projects'>, name: string, links: ProjectLinks) => {
    if (name) {
      await updateName({ projectId, name });
    }
    await updateLinks({ projectId, projectLinks: toProjectLinksPayload(links) });
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <NewProjectRow onCreated={() => setExpandedId(null)} />
          <View style={SEPARATOR_STYLE} />
          {(projects ?? []).map((project, idx) => (
            <View key={String(project.projectId)}>
              <ProjectRow
                project={project}
                isExpanded={expandedId === String(project.projectId)}
                onToggle={() => handleToggle(project.projectId)}
                onSetActive={() => void handleSetActive(project.projectId)}
                onSave={(name, links) => handleSave(project.projectId, name, links)}
              />
              {idx < (projects?.length ?? 0) - 1 && (
                <View style={SEPARATOR_STYLE} />
              )}
            </View>
          ))}
        </ScrollView>
      </Modal>
    </>
  );
}
