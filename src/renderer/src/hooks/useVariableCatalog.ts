import { useMemo } from 'react';
import { useEnvStore } from '../stores/envStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useTabStore } from '../stores/tabStore';
import { buildVariableCatalog, folderVariableEntries, type VariableInfo } from '../utils/variableCatalog';

export function useVariableCatalog(): VariableInfo[] {
  const environments = useEnvStore((state) => state.environments);
  const globals = useEnvStore((state) => state.globals);
  const collectionId = useTabStore((state) => {
    const tab = state.tabs.find((entry) => entry.id === state.activeTabId);
    return tab?.collectionId;
  });
  const nodes = useCollectionStore((state) => state.nodes);
  const folderVariables = useMemo(() => folderVariableEntries(collectionId, nodes), [collectionId, nodes]);
  return useMemo(
    () => buildVariableCatalog(environments, globals, folderVariables),
    [environments, globals, folderVariables]
  );
}
