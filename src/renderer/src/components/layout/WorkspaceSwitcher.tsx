import { Check, ChevronDown, Layers3, Pencil, Plus, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabStore } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { Menu, type MenuAction } from '../common/Menu';
import { useI18n } from '../../i18n';

export function WorkspaceSwitcher(): React.JSX.Element {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const active = workspaces.find((workspace) => workspace.isActive);
  const activate = useWorkspaceStore((state) => state.activate);
  const create = useWorkspaceStore((state) => state.create);
  const rename = useWorkspaceStore((state) => state.rename);
  const remove = useWorkspaceStore((state) => state.remove);
  const { t } = useI18n();

  const assertIdle = (): boolean => {
    if (!useTabStore.getState().tabs.some((tab) => tab.sending)) return true;
    useUiStore.getState().toast('warning', t('Wait for running requests'), t('Cancel the active request before switching workspaces.'));
    return false;
  };

  const switchTo = (id: string): void => {
    if (id === active?.id) return;
    if (!assertIdle()) return;
    const run = (): void => {
      void activate(id);
    };
    const hasUnsaved = useTabStore.getState().tabs.some((tab) => tab.dirty);
    if (hasUnsaved) {
      useUiStore.getState().openConfirm({
        title: t('Switch workspace?'),
        message: t('Open tabs belong to the current workspace and will be closed.'),
        confirmLabel: t('Switch workspace'),
        danger: true,
        onConfirm: run
      });
      return;
    }
    run();
  };

  const createWorkspace = (): void => {
    useUiStore.getState().openPrompt({
      title: t('New workspace'),
      label: t('Workspace name'),
      initialValue: t('New workspace'),
      confirmLabel: t('Create'),
      onSubmit: async (name) => {
        if (!assertIdle()) return;
        const hasUnsaved = useTabStore.getState().tabs.some((tab) => tab.dirty);
        if (hasUnsaved) {
          useUiStore.getState().openConfirm({
            title: t('Create workspace?'),
            message: t('Open tabs belong to the current workspace and will be closed.'),
            confirmLabel: t('Create workspace'),
            danger: true,
            onConfirm: async () => {
              await create(name);
            }
          });
          return;
        }
        await create(name);
      }
    });
  };

  const renameWorkspace = (): void => {
    if (!active) return;
    useUiStore.getState().openPrompt({
      title: t('Rename workspace'),
      label: t('Workspace name'),
      initialValue: active.name,
      confirmLabel: t('Rename'),
      onSubmit: async (name) => {
        await rename(active.id, name);
      }
    });
  };

  const deleteWorkspace = (): void => {
    if (!active) return;
    if (!assertIdle()) return;
    useUiStore.getState().openConfirm({
      title: t('Delete workspace'),
      message: t('Delete “{name}” with all its collections, environments and history? This cannot be undone.', { name: active.name }),
      confirmLabel: t('Delete workspace'),
      danger: true,
      onConfirm: async () => {
        await remove(active.id);
      }
    });
  };

  const items: MenuAction[] = [
    ...workspaces.map((workspace) => ({
      label: workspace.name,
      icon: workspace.isActive ? <Check size={15} /> : <Layers3 size={15} />,
      onSelect: () => switchTo(workspace.id)
    })),
    { separator: true },
    { label: t('New workspace…'), icon: <Plus size={15} />, onSelect: createWorkspace },
    { label: t('Rename current…'), icon: <Pencil size={15} />, onSelect: renameWorkspace, disabled: !active },
    {
      label: t('Delete current…'),
      icon: <Trash2 size={15} />,
      danger: true,
      disabled: workspaces.length <= 1,
      onSelect: deleteWorkspace
    }
  ];

  return (
    <Menu
      width={250}
      trigger={
        <button type="button" className="workspace-pill" title={t('Active workspace')}>
          <Layers3 size={14} />
          <span>{active?.name ?? t('Workspace')}</span>
          <ChevronDown size={13} />
        </button>
      }
      items={items}
    />
  );
}
