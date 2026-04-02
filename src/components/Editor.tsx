import React from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { useDocument } from '../contexts/DocumentContext';
import { useTheme } from '../contexts/ThemeContext';
import './Editor.css';

export const Editor: React.FC = () => {
    const { activeFilePath, content, setContent, saveFile } = useDocument();
    const { theme } = useTheme();
    const saveFileRef = React.useRef(saveFile);

    // Update ref when saveFile changes
    React.useEffect(() => {
        saveFileRef.current = saveFile;
    }, [saveFile]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setContent(value);
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        // Add save command (Ctrl+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveFileRef.current();
        });
    };

    // Determine language from file extension
    const getLanguage = (path: string | null) => {
        if (!path) return 'markdown';
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'tsx': return 'typescript';
            case 'json': return 'json';
            case 'css': return 'css';
            case 'md': return 'markdown';
            case 'txt': return 'plaintext';
            default: return 'plaintext';
        }
    };

    if (!activeFilePath) {
        return (
            <div className="editor-empty">
                <p>ファイルを選択して編集を開始してください</p>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <MonacoEditor
                key={activeFilePath}
                height="100%"
                language={getLanguage(activeFilePath)}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 4,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                }}
            />
        </div>
    );
};
