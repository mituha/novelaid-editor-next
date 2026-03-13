import React, { useState, useEffect } from 'react';
import { readDir, DirEntry } from '@tauri-apps/plugin-fs';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import './FileExplorer.css';

interface FileExplorerProps {
    projectPath: string;
}

interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    isOpen?: boolean;
    children?: FileNode[];
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectPath }) => {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = async (path: string): Promise<FileNode[]> => {
        try {
            const entries = await readDir(path);
            const nodes: FileNode[] = entries.map(entry => ({
                name: entry.name || '',
                path: `${path}/${entry.name}`, // In v2, we might need to join path manually or use more robust way
                isDirectory: entry.isDirectory,
                isOpen: false,
                children: entry.isDirectory ? [] : undefined
            }));
            
            // Sort: directories first, then files alphabetically
            return nodes.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name) || 0;
            });
        } catch (err) {
            console.error('Failed to read directory:', err);
            throw err;
        }
    };

    useEffect(() => {
        if (projectPath && projectPath !== '未選択') {
            setLoading(true);
            loadFiles(projectPath)
                .then(setFiles)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [projectPath]);

    const toggleFolder = async (node: FileNode) => {
        if (!node.isDirectory) return;

        const updateNodesRecursive = async (nodes: FileNode[]): Promise<FileNode[]> => {
            return Promise.all(nodes.map(async n => {
                if (n.path === node.path) {
                    const nextOpenState = !n.isOpen;
                    let children = n.children;
                    if (nextOpenState && (!children || children.length === 0)) {
                        try {
                            const newChildren = await loadFiles(n.path);
                            children = newChildren;
                        } catch (e) {
                            console.error("Failed to load subfolder", e);
                        }
                    }
                    return { ...n, isOpen: nextOpenState, children };
                }
                if (n.children && n.children.length > 0) {
                    return { ...n, children: await updateNodesRecursive(n.children) };
                }
                return n;
            }));
        };

        const newFiles = await updateNodesRecursive(files);
        setFiles(newFiles);
    };

    const renderNode = (node: FileNode, depth = 0) => {
        const isDirectory = node.isDirectory;
        const Icon = isDirectory ? (node.isOpen ? ChevronDown : ChevronRight) : null;
        const FileIcon = isDirectory ? Folder : File;

        return (
            <div key={node.path}>
                <div 
                    className={`file-node ${isDirectory ? 'directory' : 'file'}`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => isDirectory && toggleFolder(node)}
                >
                    {Icon && <Icon size={14} className="folder-chevron" />}
                    {!Icon && <div className="chevron-spacer" />}
                    <FileIcon size={16} className="file-icon" />
                    <span className="file-name">{node.name}</span>
                </div>
                {isDirectory && node.isOpen && node.children && (
                    <div className="folder-children">
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (projectPath === '未選択') {
        return <div className="file-explorer-empty">プロジェクトを選択してください</div>;
    }

    if (loading) {
        return <div className="file-explorer-loading">読み込み中...</div>;
    }

    if (error) {
        return <div className="file-explorer-error">エラー: {error}</div>;
    }

    return (
        <div className="file-explorer">
            <div className="file-explorer-header">
                <span>ファイル</span>
            </div>
            <div className="file-explorer-content">
                {files.map(file => renderNode(file))}
            </div>
        </div>
    );
};
