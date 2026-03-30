import React, { createContext, useContext, useState, useCallback } from 'react';
import { readDocument, writeDocument, NovelaidDocument, NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';

interface DocumentContextType {
    activeFilePath: string | null;
    content: string;
    metadata: Record<string, any>;
    documentType: NovelaidDocumentType;
    isDirty: boolean;
    openFile: (path: string) => Promise<void>;
    saveFile: () => Promise<void>;
    setContent: (content: string) => void;
    setMetadata: (metadata: Record<string, any>) => void;
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
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [documentType, setDocumentType] = useState<NovelaidDocumentType>('novel');
    const [isDirty, setIsDirty] = useState(false);

    const openFile = useCallback(async (path: string) => {
        try {
            const doc = await readDocument(path);
            setActiveFilePath(path);
            setContent(doc.content);
            setMetadata(doc.metadata || {});
            setDocumentType(doc.documentType);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }, []);

    const saveFile = useCallback(async () => {
        if (!activeFilePath) return;
        try {
            const doc: NovelaidDocument = {
                content,
                metadata,
                documentType
            };
            await writeDocument(activeFilePath, doc);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }, [activeFilePath, content, metadata, documentType]);

    const handleSetContent = useCallback((newContent: string) => {
        setContent(newContent);
        setIsDirty(true);
    }, []);

    const handleSetMetadata = useCallback((newMetadata: Record<string, any>) => {
        setMetadata(newMetadata);
        setIsDirty(true);
    }, []);

    return (
        <DocumentContext.Provider value={{
            activeFilePath,
            content,
            metadata,
            documentType,
            isDirty,
            openFile,
            saveFile,
            setContent: handleSetContent,
            setMetadata: handleSetMetadata
        }}>
            {children}
        </DocumentContext.Provider>
    );
};
