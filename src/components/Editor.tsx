import React from 'react';
import MonacoEditor, { OnMount, Monaco } from '@monaco-editor/react';
import { useDocument } from '../contexts/DocumentContext';
import { useTheme } from '../contexts/ThemeContext';
import { NovelaidDocumentType } from 'tauri-plugin-novelaid-fs-api';
import './Editor.css';

interface EditorProps {
    pane: 'left' | 'right';
}

export const Editor: React.FC<EditorProps> = ({ pane }) => {
    const {
        openDocuments,
        activeLeftItem,
        activeRightItem,
        setActivePane,
        setContent,
        saveFile
    } = useDocument();

    const activeItem = pane === 'left' ? activeLeftItem : activeRightItem;
    const activeDocument = openDocuments.find(doc => doc.path === activeItem?.path) || null;
    const activeFilePath = activeItem?.path || null;

    const viewMode = React.useMemo(() => {
        if (!activeItem || !activeDocument) return 'none';
        if (activeItem.isPreview) {
            return pane === 'left' ? activeDocument.leftPreviewView : activeDocument.rightPreviewView;
        }
        return pane === 'left' ? activeDocument.leftMainView : activeDocument.rightMainView;
    }, [activeItem, activeDocument, pane]);
    const content = activeDocument?.content || '';
    const { theme } = useTheme();
    const saveFileRef = React.useRef(saveFile);
    const editorRef = React.useRef<any>(null);
    const decorationsRef = React.useRef<string[]>([]);

    // Update ref when saveFile changes
    React.useEffect(() => {
        saveFileRef.current = saveFile;
    }, [saveFile]);

    // 全角スペースの可視化更新
    const updateDecorations = React.useCallback((editor: any, monaco: Monaco) => {
        const model = editor.getModel();
        if (!model) return;

        const decorations: any[] = [];
        const content = model.getValue();
        const regex = /\u3000/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + 1);
            decorations.push({
                range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                options: {
                    inlineClassName: 'monaco-full-width-space',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            });
        }

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    }, []);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setContent(value);
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Focus handler to update active pane
        editor.onDidFocusEditorWidget(() => {
            setActivePane(pane);
        });

        decorationsRef.current = []; // 前のエディタインスタンスのデコレーションIDをクリア

        // 言語登録
        registerNovelLanguage(monaco);

        // テーマ登録
        defineThemes(monaco);

        // 初回デコレーション
        updateDecorations(editor, monaco);

        // 内容変更時のデコレーション更新
        editor.onDidChangeModelContent(() => {
            updateDecorations(editor, monaco);
        });

        // Add save command (Ctrl+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveFileRef.current();
        });
    };

    // novel言語の登録と定義
    const registerNovelLanguage = (monaco: Monaco) => {
        const languages = monaco.languages.getLanguages();
        if (languages.some((lang: any) => lang.id === 'novel')) return;

        monaco.languages.register({ id: 'novel' });
        monaco.languages.setMonarchTokensProvider('novel', {
            tokenizer: {
                root: [
                    // 台詞: 「 」『 』
                    [/「[^」]*」/, 'novel.dialogue'],
                    [/『[^』]*』/, 'novel.dialogue'],

                    // ルビ・傍記 (カクヨム記法準拠)
                    // |文字《るび》
                    [/\|[^《]*《[^》]*》/, 'novel.ruby'],
                    // 漢字《るび》
                    [/[\u4E00-\u9FFF]+《[^》]*》/, 'novel.ruby'],
                    // 《《傍点》》
                    [/《《[^》]*》》/, 'novel.emphasis'],
                ]
            }
        });
    };

    // カスタムテーマの定義
    const defineThemes = (monaco: Monaco) => {
        monaco.editor.defineTheme('novelaid-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'novel.dialogue', foreground: 'A8FFB3' }, // 明るい緑
                { token: 'novel.ruby', foreground: '80CBC4', fontStyle: 'italic' },
                { token: 'novel.emphasis', foreground: 'FFAB91', fontStyle: 'bold' },
            ],
            colors: {}
        });

        monaco.editor.defineTheme('novelaid-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'novel.dialogue', foreground: '2E7D32' }, // 濃い緑
                { token: 'novel.ruby', foreground: '00695C', fontStyle: 'italic' },
                { token: 'novel.emphasis', foreground: 'D84315', fontStyle: 'bold' },
            ],
            colors: {}
        });
    };

    // Determine language from documentType or file extension
    const getLanguage = (documentType: NovelaidDocumentType | undefined, baseName: string | undefined) => {
        // 1. DocumentTypeを最優先
        if (documentType) {
            switch (documentType) {
                case 'novel': return 'novel';
                case 'markdown': return 'markdown';
                case 'css': return 'css';
                case 'gitDiff': return 'diff';
                case 'browser': return 'html';
                case 'chat': return 'json';
            }
        }

        // 2. 拡張子による補助判定
        if (!baseName) return 'plaintext';
        const ext = baseName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js': return 'javascript';
            case 'ts':
            case 'tsx': return 'typescript';
            case 'json': return 'json';
            case 'css': return 'css';
            case 'md': return 'markdown';
            case 'txt': return 'plaintext';
            default: return 'plaintext';
        }
    };

    if (viewMode === 'none' || !activeFilePath) {
        return (
            <div className="editor-empty">
                <p>ファイルを選択して編集を開始してください</p>
            </div>
        );
    }

    if (viewMode !== 'editor') {
        const viewNames: Record<string, string> = {
            'canvas': 'キャンバス',
            'reader': 'リーダー',
            'preview': 'プレビュー'
        };

        return (
            <div className="view-placeholder">
                <div className="placeholder-content">
                    <h2>{viewNames[viewMode] || viewMode} View</h2>
                    <p>現在、{viewNames[viewMode] || viewMode} 表示機能は開発中です。</p>
                    <div className="path-display">{activeFilePath}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <MonacoEditor
                key={`${activeFilePath}-${activeItem?.isPreview ? 'preview' : 'main'}`}
                height="100%"
                language={getLanguage(activeDocument?.documentType, activeDocument?.baseName)}
                theme={theme === 'dark' ? 'novelaid-dark' : 'novelaid-light'}
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
                    renderWhitespace: 'all',
                    renderControlCharacters: true,
                    unicodeHighlight: {
                        ambiguousCharacters: false,
                        invisibleCharacters: false,
                    }
                }}
            />
        </div>
    );
};
