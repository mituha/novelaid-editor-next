import React, { createContext, useContext, useState, useCallback } from 'react';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';

interface DocumentContextType {
    activeFilePath: string | null;
    content: string;
    isDirty: boolean;
    openFile: (path: string) => Promise<void>;
    saveFile: () => Promise<void>;
    setContent: (content: string) => void;
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
    const [isDirty, setIsDirty] = useState(false);

    const openFile = useCallback(async (path: string) => {
        try {
            const data = await readFile(path);
            const text = new TextDecoder().decode(data);
            setActiveFilePath(path);
            setContent(text);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to open file:', error);
            // Optionally handle error (e.g., toast notification)
        }
    }, []);

    const saveFile = useCallback(async () => {
        if (!activeFilePath) return;
        try {
            const data = new TextEncoder().encode(content);
            await writeFile(activeFilePath, data);
            setIsDirty(false);
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    }, [activeFilePath, content]);

    const handleSetContent = useCallback((newContent: string) => {
        setContent(newContent);
        setIsDirty(true);
    }, []);

    return (
        <DocumentContext.Provider value={{
            activeFilePath,
            content,
            isDirty,
            openFile,
            saveFile,
            setContent: handleSetContent
        }}>
            {children}
        </DocumentContext.Provider>
    );
};
