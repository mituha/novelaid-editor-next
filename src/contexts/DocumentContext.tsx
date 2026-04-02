import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { readDocument, writeDocument, NovelaidDocument, NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';
import { DocumentViewType } from '../types/document';

export interface DocumentState {
    path: string;
    content: string;
    metadata: Record<string, any>;
    documentType: NovelaidDocumentType;
    isDirty: boolean;
    // 各ペイン・各スロット（メイン/プレビュー）の表示状態。'none'ならタブが表示されない。
    leftMainView: DocumentViewType;
    rightMainView: DocumentViewType;
    leftPreviewView: DocumentViewType;
    rightPreviewView: DocumentViewType;
}

export interface TabItem {
    path: string;
    isPreview: boolean;
}

interface DocumentContextType {
    openDocuments: DocumentState[];
    activeLeftItem: TabItem | null;
    activeRightItem: TabItem | null;
    isSplit: boolean;
    activePane: 'left' | 'right';
    splitRatio: number; // 0 to 1
    
    openDocument: (path: string, pane?: 'left' | 'right', asPreview?: boolean) => Promise<void>;
    closeDocument: (path: string, pane: 'left' | 'right', isPreview: boolean) => void;
    switchDocument: (path: string, pane: 'left' | 'right', isPreview: boolean) => void;
    saveDocument: (path?: string) => Promise<void>;
    setContent: (content: string, path?: string) => void;
    setMetadata: (metadata: Record<string, any>, path?: string) => void;
    changeViewType: (path: string, pane: 'left' | 'right', viewType: DocumentViewType, isPreview: boolean) => void;
    toggleSplit: () => void;
    setActivePane: (pane: 'left' | 'right') => void;
    setSplitRatio: (ratio: number) => void;
    
    // Legacy support or simplified access for current active
    activeFilePath: string | null; 
    activeItem: TabItem | null;
    content: string;
    metadata: Record<string, any>;
    isDirty: boolean;
    saveFile: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocument = () => {
    const context = useContext(DocumentContext);
    if (!context) {
        throw new Error('useDocument must be used within a DocumentProvider');
    }
    return context;
};

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [openDocuments, setOpenDocuments] = useState<DocumentState[]>([]);
    const [activeLeftItem, setActiveLeftItem] = useState<TabItem | null>(null);
    const [activeRightItem, setActiveRightItem] = useState<TabItem | null>(null);
    const [isSplit, setIsSplit] = useState(false);
    const [activePane, setActivePane] = useState<'left' | 'right'>('left');
    const [splitRatio, setSplitRatio] = useState(0.5);

    const activeItem = useMemo(() => {
        return activePane === 'left' ? activeLeftItem : activeRightItem;
    }, [activePane, activeLeftItem, activeRightItem]);

    const activeDocument = useMemo(() => {
        return openDocuments.find(doc => doc.path === activeItem?.path) || null;
    }, [openDocuments, activeItem]);

    const openDocument = useCallback(async (path: string, pane?: 'left' | 'right', asPreview: boolean = false) => {
        const targetPane = pane || activePane;
        const viewProp = asPreview 
            ? (targetPane === 'left' ? 'leftPreviewView' : 'rightPreviewView')
            : (targetPane === 'left' ? 'leftMainView' : 'rightMainView');
        const defaultView: DocumentViewType = asPreview ? 'preview' : 'editor';
        
        // If already open anywhere, update flags
        const existingDoc = openDocuments.find(doc => doc.path === path);
        if (existingDoc) {
            setOpenDocuments(prev => prev.map(doc => 
                doc.path === path 
                    ? { ...doc, [viewProp]: doc[viewProp] === 'none' ? defaultView : doc[viewProp] }
                    : doc
            ));
            
            const newItem = { path, isPreview: asPreview };
            if (targetPane === 'left') {
                setActiveLeftItem(newItem);
            } else {
                setActiveRightItem(newItem);
            }
            setActivePane(targetPane);
            return;
        }

        try {
            const doc = await readDocument(path);
            const newState: DocumentState = {
                path,
                content: doc.content,
                metadata: doc.metadata || {},
                documentType: doc.documentType,
                isDirty: false,
                leftMainView: 'none',
                rightMainView: 'none',
                leftPreviewView: 'none',
                rightPreviewView: 'none',
                [viewProp]: defaultView
            };
            setOpenDocuments(prev => [...prev, newState]);
            
            const newItem = { path, isPreview: asPreview };
            if (targetPane === 'left') {
                setActiveLeftItem(newItem);
            } else {
                setActiveRightItem(newItem);
            }
            setActivePane(targetPane);
        } catch (error) {
            console.error('Failed to open document:', error);
        }
    }, [openDocuments, activePane]);

    const closeDocument = useCallback((path: string, pane: 'left' | 'right', isPreview: boolean) => {
        const viewProp = isPreview 
            ? (pane === 'left' ? 'leftPreviewView' : 'rightPreviewView')
            : (pane === 'left' ? 'leftMainView' : 'rightMainView');

        setOpenDocuments(prev => {
            const doc = prev.find(d => d.path === path);
            if (!doc) return prev;

            const updatedDoc = { ...doc, [viewProp]: 'none' as DocumentViewType };
            const isCompletelyClosed = 
                updatedDoc.leftMainView === 'none' && 
                updatedDoc.rightMainView === 'none' && 
                updatedDoc.leftPreviewView === 'none' && 
                updatedDoc.rightPreviewView === 'none';
            
            if (isCompletelyClosed) {
                return prev.filter(d => d.path !== path);
            } else {
                return prev.map(d => d.path === path ? updatedDoc : d);
            }
        });

        // Update active item for the closed pane
        const activeItem = pane === 'left' ? activeLeftItem : activeRightItem;
        if (activeItem?.path === path && activeItem?.isPreview === isPreview) {
            // Find another tab to focus in the same pane
            setOpenDocuments(prev => {
                const remainingInPane: TabItem[] = [];
                prev.forEach(d => {
                    if (pane === 'left') {
                        if (d.leftMainView !== 'none') remainingInPane.push({ path: d.path, isPreview: false });
                        if (d.leftPreviewView !== 'none') remainingInPane.push({ path: d.path, isPreview: true });
                    } else {
                        if (d.rightMainView !== 'none') remainingInPane.push({ path: d.path, isPreview: false });
                        if (d.rightPreviewView !== 'none') remainingInPane.push({ path: d.path, isPreview: true });
                    }
                });

                if (remainingInPane.length > 0) {
                    const next = remainingInPane[remainingInPane.length - 1];
                    if (pane === 'left') setActiveLeftItem(next);
                    else setActiveRightItem(next);
                } else {
                    if (pane === 'left') setActiveLeftItem(null);
                    else setActiveRightItem(null);
                }
                return prev;
            });
        }
    }, [activeLeftItem, activeRightItem]);

    const switchDocument = useCallback((path: string, pane: 'left' | 'right', isPreview: boolean) => {
        const newItem = { path, isPreview };
        if (pane === 'left') {
            setActiveLeftItem(newItem);
        } else {
            setActiveRightItem(newItem);
        }
        setActivePane(pane);
    }, []);

    const changeViewType = useCallback((path: string, pane: 'left' | 'right', viewType: DocumentViewType, isPreview: boolean) => {
        const viewProp = isPreview 
            ? (pane === 'left' ? 'leftPreviewView' : 'rightPreviewView')
            : (pane === 'left' ? 'leftMainView' : 'rightMainView');
        
        setOpenDocuments(prev => prev.map(doc => 
            doc.path === path ? { ...doc, [viewProp]: viewType } : doc
        ));
    }, []);

    const toggleSplit = useCallback(() => {
        const nextSplit = !isSplit;
        
        if (nextSplit) {
            // Opening split: current left document should also be in right
            if (activeLeftItem) {
                const { path, isPreview } = activeLeftItem;
                const viewProp = isPreview ? 'rightPreviewView' : 'rightMainView';
                setOpenDocuments(docs => docs.map(doc => {
                    if (doc.path === path) {
                        const currentLeftView = isPreview ? doc.leftPreviewView : doc.leftMainView;
                        return { ...doc, [viewProp]: currentLeftView };
                    }
                    return doc;
                }));
                setActiveRightItem(activeLeftItem);
            }
            setActivePane('right');
        } else {
            // Closing split: clear all right views
            setOpenDocuments(docs => docs.map(doc => ({
                ...doc,
                rightMainView: 'none' as DocumentViewType,
                rightPreviewView: 'none' as DocumentViewType
            })).filter(doc => 
                doc.leftMainView !== 'none' || doc.leftPreviewView !== 'none'
            ));

            setActiveRightItem(null);
            setActivePane('left');
        }
        
        setIsSplit(nextSplit);
    }, [isSplit, activeLeftItem]);

    const handleSetSplitRatio = useCallback((ratio: number) => {
        setSplitRatio(Math.max(0.1, Math.min(0.9, ratio)));
    }, []);

    const setContent = useCallback((newContent: string, path?: string) => {
        const targetPath = path || activeItem?.path;
        if (!targetPath) return;

        setOpenDocuments(prev => prev.map(doc => 
            doc.path === targetPath ? { ...doc, content: newContent, isDirty: true } : doc
        ));
    }, [activeItem]);

    const setMetadata = useCallback((newMetadata: Record<string, any>, path?: string) => {
        const targetPath = path || activeItem?.path;
        if (!targetPath) return;

        setOpenDocuments(prev => prev.map(doc => 
            doc.path === targetPath ? { ...doc, metadata: newMetadata, isDirty: true } : doc
        ));
    }, [activeItem]);

    const saveDocument = useCallback(async (path?: string) => {
        const targetPath = path || activeItem?.path;
        const docToSave = openDocuments.find(doc => doc.path === targetPath);
        if (!targetPath || !docToSave) return;

        try {
            const novelaidDoc: NovelaidDocument = {
                content: docToSave.content,
                metadata: docToSave.metadata,
                documentType: docToSave.documentType
            };
            await writeDocument(targetPath, novelaidDoc);
            
            setOpenDocuments(prev => prev.map(doc => 
                doc.path === targetPath ? { ...doc, isDirty: false } : doc
            ));
        } catch (error) {
            console.error('Failed to save document:', error);
        }
    }, [activeItem, openDocuments]);

    const contextValue: DocumentContextType = {
        openDocuments,
        activeLeftItem,
        activeRightItem,
        isSplit,
        activePane,
        openDocument,
        closeDocument,
        switchDocument,
        saveDocument,
        setContent,
        setMetadata,
        changeViewType,
        toggleSplit,
        setActivePane,
        splitRatio,
        setSplitRatio: handleSetSplitRatio,
        
        // Legacy/Simplified interface
        activeFilePath: activeItem?.path || null,
        activeItem,
        content: activeDocument?.content || '',
        metadata: activeDocument?.metadata || {},
        isDirty: activeDocument?.isDirty || false,
        saveFile: () => saveDocument()
    };

    return (
        <DocumentContext.Provider value={contextValue}>
            {children}
        </DocumentContext.Provider>
    );
};

