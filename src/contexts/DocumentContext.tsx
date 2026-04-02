import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { readDocument, writeDocument, NovelaidDocument, NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';

export interface DocumentState {
    path: string;
    content: string;
    metadata: Record<string, any>;
    documentType: NovelaidDocumentType;
    isDirty: boolean;
    // Lifecycle management flags for panes
    isInLeft: boolean;
    isInRight: boolean;
}

interface DocumentContextType {
    openDocuments: DocumentState[];
    activeLeftPath: string | null;
    activeRightPath: string | null;
    isSplit: boolean;
    activePane: 'left' | 'right';
    
    openDocument: (path: string, pane?: 'left' | 'right') => Promise<void>;
    closeDocument: (path: string, pane: 'left' | 'right') => void;
    switchDocument: (path: string, pane: 'left' | 'right') => void;
    saveDocument: (path?: string) => Promise<void>;
    setContent: (content: string, path?: string) => void;
    setMetadata: (metadata: Record<string, any>, path?: string) => void;
    toggleSplit: () => void;
    setActivePane: (pane: 'left' | 'right') => void;
    
    // Legacy support or simplified access for current active
    activeFilePath: string | null; 
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
    const [activeLeftPath, setActiveLeftPath] = useState<string | null>(null);
    const [activeRightPath, setActiveRightPath] = useState<string | null>(null);
    const [isSplit, setIsSplit] = useState(false);
    const [activePane, setActivePane] = useState<'left' | 'right'>('left');

    const activeDocumentPath = useMemo(() => {
        return activePane === 'left' ? activeLeftPath : activeRightPath;
    }, [activePane, activeLeftPath, activeRightPath]);

    const activeDocument = useMemo(() => {
        return openDocuments.find(doc => doc.path === activeDocumentPath) || null;
    }, [openDocuments, activeDocumentPath]);

    const openDocument = useCallback(async (path: string, pane?: 'left' | 'right') => {
        const targetPane = pane || activePane;
        
        // If already open anywhere, update flags
        const existingDoc = openDocuments.find(doc => doc.path === path);
        if (existingDoc) {
            setOpenDocuments(prev => prev.map(doc => 
                doc.path === path 
                    ? { ...doc, [targetPane === 'left' ? 'isInLeft' : 'isInRight']: true }
                    : doc
            ));
            
            if (targetPane === 'left') {
                setActiveLeftPath(path);
            } else {
                setActiveRightPath(path);
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
                isInLeft: targetPane === 'left',
                isInRight: targetPane === 'right'
            };
            setOpenDocuments(prev => [...prev, newState]);
            
            if (targetPane === 'left') {
                setActiveLeftPath(path);
            } else {
                setActiveRightPath(path);
            }
            setActivePane(targetPane);
        } catch (error) {
            console.error('Failed to open document:', error);
        }
    }, [openDocuments, activePane]);

    const closeDocument = useCallback((path: string, pane: 'left' | 'right') => {
        setOpenDocuments(prev => {
            const doc = prev.find(d => d.path === path);
            if (!doc) return prev;

            const isClosingLast = (pane === 'left' ? !doc.isInRight : !doc.isInLeft);
            
            if (isClosingLast) {
                // Completely remove from list
                return prev.filter(d => d.path !== path);
            } else {
                // Just update flags
                return prev.map(d => 
                    d.path === path 
                        ? { ...d, [pane === 'left' ? 'isInLeft' : 'isInRight']: false }
                        : d
                );
            }
        });

        // Update active path for the closed pane
        if (pane === 'left' && activeLeftPath === path) {
            setOpenDocuments(prev => {
                const remainingLeft = prev.filter(d => d.path !== path ? d.isInLeft : false);
                if (remainingLeft.length > 0) {
                    setActiveLeftPath(remainingLeft[remainingLeft.length - 1].path);
                } else {
                    setActiveLeftPath(null);
                }
                return prev;
            });
        } else if (pane === 'right' && activeRightPath === path) {
            setOpenDocuments(prev => {
                const remainingRight = prev.filter(d => d.path !== path ? d.isInRight : false);
                if (remainingRight.length > 0) {
                    setActiveRightPath(remainingRight[remainingRight.length - 1].path);
                } else {
                    setActiveRightPath(null);
                }
                return prev;
            });
        }
    }, [activeLeftPath, activeRightPath]);

    const switchDocument = useCallback((path: string, pane: 'left' | 'right') => {
        if (pane === 'left') {
            setActiveLeftPath(path);
        } else {
            setActiveRightPath(path);
        }
        setActivePane(pane);
    }, []);

    const toggleSplit = useCallback(() => {
        const nextSplit = !isSplit;
        
        if (nextSplit) {
            // Opening split: current left document should also be in right
            if (activeLeftPath) {
                setOpenDocuments(docs => docs.map(doc => 
                    doc.path === activeLeftPath ? { ...doc, isInRight: true } : doc
                ));
                setActiveRightPath(activeLeftPath);
            }
            setActivePane('right');
        } else {
            // Closing split: remove documents only in right, clear isInRight flags
            setOpenDocuments(docs => docs.filter(doc => doc.isInLeft).map(doc => ({ ...doc, isInRight: false })));
            setActiveRightPath(null);
            setActivePane('left');
        }
        
        setIsSplit(nextSplit);
    }, [isSplit, activeLeftPath]);

    const setContent = useCallback((newContent: string, path?: string) => {
        const targetPath = path || activeDocumentPath;
        if (!targetPath) return;

        setOpenDocuments(prev => prev.map(doc => 
            doc.path === targetPath ? { ...doc, content: newContent, isDirty: true } : doc
        ));
    }, [activeDocumentPath]);

    const setMetadata = useCallback((newMetadata: Record<string, any>, path?: string) => {
        const targetPath = path || activeDocumentPath;
        if (!targetPath) return;

        setOpenDocuments(prev => prev.map(doc => 
            doc.path === targetPath ? { ...doc, metadata: newMetadata, isDirty: true } : doc
        ));
    }, [activeDocumentPath]);

    const saveDocument = useCallback(async (path?: string) => {
        const targetPath = path || activeDocumentPath;
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
    }, [activeDocumentPath, openDocuments]);

    const contextValue: DocumentContextType = {
        openDocuments,
        activeLeftPath,
        activeRightPath,
        isSplit,
        activePane,
        openDocument,
        closeDocument,
        switchDocument,
        saveDocument,
        setContent,
        setMetadata,
        toggleSplit,
        setActivePane,
        
        // Legacy/Simplified interface
        activeFilePath: activeDocumentPath,
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

