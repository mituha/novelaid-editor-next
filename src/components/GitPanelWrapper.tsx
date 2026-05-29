import React, { useMemo } from 'react';
import { GitProvider, GitPanel } from 'restar-app';
import { useProject } from '../contexts/ProjectContext';
import { useDocument } from '../contexts/DocumentContext';
import { TauriGitClient } from '../services/tauriGitClient';

export const GitPanelWrapper: React.FC = () => {
    const { projectPath } = useProject();
    const { openDocument } = useDocument();

    const client = useMemo(() => new TauriGitClient(), []);

    const handleOpenFileDiff = React.useCallback(async (filePath: string, staged: boolean) => {
        // gitDiff://staged/path or gitDiff://unstaged/path を開く
        const scheme = staged ? 'staged' : 'unstaged';
        await openDocument(`gitDiff://${scheme}/${filePath}`);
    }, [openDocument]);

    return (
        <GitProvider client={client} currentDir={projectPath}>
            <GitPanel onOpenFileDiff={handleOpenFileDiff} />
        </GitProvider>
    );
};
