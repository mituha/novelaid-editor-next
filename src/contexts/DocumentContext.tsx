import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { readDocument, writeDocument, NovelaidDocument, NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';

export interface DocumentState {
    path: string;
    content: string;
    metadata: Record<string, any>;
    documentType: NovelaidDocumentType;
    isDirty: boolean;
}

interface DocumentContextType {
    openDocuments: DocumentState[];
    activeDocumentPath: string | null;
    activeDocument: DocumentState | null;
    openDocument: (path: string) => Promise<void>;
    closeDocument: (path: string) => void;
    switchDocument: (path: string) => void;
    saveDocument: (path?: string) => Promise<void>;
    setContent: (content: string, path?: string) => void;
    setMetadata: (metadata: Record<string, any>, path?: string) => void;
    
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
    const [activeDocumentPath, setActiveDocumentPath] = useState<string | null>(null);

    const activeDocument = useMemo(() => {
        return openDocuments.find(doc => doc.path === activeDocumentPath) || null;
    }, [openDocuments, activeDocumentPath]);

    const openDocument = useCallback(async (path: string) => {
        // If already open, just switch
        const existingDoc = openDocuments.find(doc => doc.path === path);
        if (existingDoc) {
            setActiveDocumentPath(path);
            return;
        }

        try {
            const doc = await readDocument(path);
            const newState: DocumentState = {
                path,
                content: doc.content,
                metadata: doc.metadata || {},
                documentType: doc.documentType,
                isDirty: false
            };
            setOpenDocuments(prev => [...prev, newState]);
            setActiveDocumentPath(path);
        } catch (error) {
            console.error('Failed to open document:', error);
        }
    }, [openDocuments]);

    const closeDocument = useCallback((path: string) => {
        setOpenDocuments(prev => {
            const index = prev.findIndex(doc => doc.path === path);
            if (index === -1) return prev;

            const newDocs = prev.filter(doc => doc.path !== path);
            
            // If we closed the active document, switch to another one
            if (activeDocumentPath === path) {
                if (newDocs.length > 0) {
                    // Try to pick the next one or the last one
                    const nextDoc = newDocs[index] || newDocs[newDocs.length - 1];
                    setActiveDocumentPath(nextDoc.path);
                } else {
                    setActiveDocumentPath(null);
                }
            }
            
            return newDocs;
        });
    }, [activeDocumentPath]);

    const switchDocument = useCallback((path: string) => {
        setActiveDocumentPath(path);
    }, []);

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

    // Legacy/Simplified interface
    const contextValue: DocumentContextType = {
        openDocuments,
        activeDocumentPath,
        activeDocument,
        openDocument,
        closeDocument,
        switchDocument,
        saveDocument,
        setContent,
        setMetadata,
        
        // Aliases for compatibility
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
