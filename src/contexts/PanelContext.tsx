import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { PanelDefinition, PaneSide, PaneState } from '../types/panel';
import { Files, Tag, MessageSquare, SearchCheck, Languages, User, MapPin, ScrollText, Database } from 'lucide-react';
import { FileExplorer } from '../components/FileExplorer';
import { useProject } from './ProjectContext';
import { MetadataPanel } from '../components/MetadataPanel';
import { MetadataListPanel } from '../components/MetadataListPanel';
import { ChatPanel } from '../novelaid-chat/components/ChatPanel';
import { ProofreaderPanel } from '../novelaid-ai/components/ProofreaderPanel';
import { ConlangPanel } from '../novelaid-conlang/components/ConlangPanel';

interface PanelContextType {
    panels: PanelDefinition[];
    leftPane: PaneState;
    rightPane: PaneState;
    registerPanel: (panel: PanelDefinition) => void;
    setActivePanel: (side: PaneSide, id: string | null) => void;
    togglePaneVisibility: (side: PaneSide) => void;
    setPaneWidth: (side: PaneSide, width: number) => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [panels, setPanels] = useState<PanelDefinition[]>([
        {
            id: 'explorer',
            title: 'エクスプローラー',
            icon: <Files size={20} />,
            component: FileExplorer,
            defaultSide: 'left'
        },
        {
            id: 'characters',
            title: '登場人物',
            icon: <User size={20} />,
            component: () => <MetadataListPanel fixedTitle="登場人物一覧" fixedTag="character" />,
            defaultSide: 'left'
        },
        {
            id: 'locations',
            title: '地名',
            icon: <MapPin size={20} />,
            component: () => <MetadataListPanel fixedTitle="地名一覧" fixedTag="location" />,
            defaultSide: 'left'
        },
        {
            id: 'plots',
            title: 'プロット',
            icon: <ScrollText size={20} />,
            component: () => <MetadataListPanel fixedTitle="プロット一覧" fixedTag="plot" />,
            defaultSide: 'left'
        },
        {
            id: 'metadata-list',
            title: 'メタデータ一覧',
            icon: <Database size={20} />,
            component: MetadataListPanel,
            defaultSide: 'left'
        },
        {
            id: 'metadata',
            title: 'メタデータ',
            icon: <Tag size={20} />,
            component: MetadataPanel,
            defaultSide: 'right'
        },
        {
            id: 'ai-chat',
            title: 'AIチャット',
            icon: <MessageSquare size={20} />,
            component: ChatPanel,
            defaultSide: 'right'
        },
        {
            id: 'ai-proofreader',
            title: 'AI校正',
            icon: <SearchCheck size={20} />,
            component: ProofreaderPanel,
            defaultSide: 'right'
        },
        {
            id: 'conlang',
            title: '架空言語',
            icon: <Languages size={20} />,
            component: ConlangPanel,
            defaultSide: 'right'
        }
    ]);

    const [leftPane, setLeftPane] = useState<PaneState>({
        activePanelId: 'explorer',
        isVisible: true,
        width: 250
    });

    const [rightPane, setRightPane] = useState<PaneState>({
        activePanelId: 'metadata',
        isVisible: true,
        width: 300
    });

    const { projectPath } = useProject();

    // プロジェクト変更時にパネル状態をリセット
    useEffect(() => {
        setLeftPane({
            activePanelId: 'explorer',
            isVisible: true,
            width: 250
        });
        setRightPane({
            activePanelId: 'metadata',
            isVisible: true,
            width: 300
        });
    }, [projectPath]);

    const registerPanel = useCallback((panel: PanelDefinition) => {
        setPanels(prev => {
            if (prev.find(p => p.id === panel.id)) return prev;
            return [...prev, panel];
        });
    }, []);

    const setActivePanel = useCallback((side: PaneSide, id: string | null) => {
        if (side === 'left') {
            setLeftPane(prev => ({ ...prev, activePanelId: id, isVisible: id === null ? false : true }));
        } else {
            setRightPane(prev => ({ ...prev, activePanelId: id, isVisible: id === null ? false : true }));
        }
    }, []);

    const togglePaneVisibility = useCallback((side: PaneSide) => {
        if (side === 'left') {
            setLeftPane(prev => ({ ...prev, isVisible: !prev.isVisible }));
        } else {
            setRightPane(prev => ({ ...prev, isVisible: !prev.isVisible }));
        }
    }, []);

    const setPaneWidth = useCallback((side: PaneSide, width: number) => {
        const minWidth = 150;
        const maxWidth = window.innerWidth * 0.5;
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));

        if (side === 'left') {
            setLeftPane(prev => ({ ...prev, width: constrainedWidth }));
        } else {
            setRightPane(prev => ({ ...prev, width: constrainedWidth }));
        }
    }, []);

    return (
        <PanelContext.Provider value={{
            panels,
            leftPane,
            rightPane,
            registerPanel,
            setActivePanel,
            togglePaneVisibility,
            setPaneWidth
        }}>
            {children}
        </PanelContext.Provider>
    );
};

export const usePanels = () => {
    const context = useContext(PanelContext);
    if (!context) {
        throw new Error('usePanels must be used within a PanelProvider');
    }
    return context;
};
