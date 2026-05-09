import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useDocument } from '../contexts/DocumentContext';
import { useProject } from '../contexts/ProjectContext';
import './FileExplorer.css';

import { DocumentIcon } from './DocumentIcon';
import { NovelaidDocumentType, readDirectory, NovelaidDirEntry, scanProjectMetadata } from 'tauri-plugin-novelaid-fs-api';
import { rename, copyFile } from '@tauri-apps/plugin-fs';
import { dirname, join, basename } from '@tauri-apps/api/path';

interface FileExplorerProps {
    projectPath?: string;
}

interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    isOpen?: boolean;
    children?: FileNode[];
    documentType: NovelaidDocumentType;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectPath: propsProjectPath }) => {
    const { projectPath: contextProjectPath } = useProject();
    const projectPath = propsProjectPath || contextProjectPath || '未選択';

    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragOverPath, setDragOverPath] = useState<string | null>(null);
    const { openDocument, activeFilePath } = useDocument();

    const loadFiles = async (path: string, parentType: NovelaidDocumentType = 'novel', recursive = false): Promise<FileNode[]> => {
        try {
            const entries = await readDirectory(path, recursive, parentType);

            const processEntries = (entries: NovelaidDirEntry[]): FileNode[] => {
                return entries.map(entry => {
                    return {
                        name: entry.name,
                        path: entry.path,
                        isDirectory: entry.isDirectory,
                        isOpen: false,
                        children: entry.children ? processEntries(entry.children) : (entry.isDirectory ? [] : undefined),
                        documentType: entry.documentType
                    };
                });
            };

            return processEntries(entries);
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
                            const newChildren = await loadFiles(n.path, n.documentType);
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


    const handleDragStart = (e: React.DragEvent, node: FileNode) => {
        e.dataTransfer.setData('text/plain', node.path);
        e.dataTransfer.effectAllowed = 'all';
        e.stopPropagation();

        const target = e.currentTarget as HTMLElement;
        target.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('dragging');
        setDragOverPath(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    };

    const handleDragEnter = (e: React.DragEvent, node: FileNode) => {
        e.preventDefault();
        setDragOverPath(node.path);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // 親要素に戻った場合などにチラつくのを防ぐため、厳密な判定が必要な場合もあるが
        // ここでは簡易的に直近の進入パスを保持する
    };

    const handleDrop = async (e: React.DragEvent, targetNode?: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverPath(null);

        const sourcePath = e.dataTransfer.getData('text/plain');
        if (!sourcePath) return;

        try {
            let destDir: string;
            if (targetNode) {
                if (sourcePath === targetNode.path) return;
                // ドロップ先がディレクトリでない場合は、その親ディレクトリをドロップ先とする
                destDir = targetNode.isDirectory ? targetNode.path : await dirname(targetNode.path);
            } else {
                // コンテナ（ルート）へのドロップ
                destDir = projectPath;
            }

            const fileName = await basename(sourcePath);
            const destPath = await join(destDir, fileName);

            if (sourcePath === destPath) return;

            if (e.ctrlKey) {
                // コピー
                await copyFile(sourcePath, destPath);
            } else {
                // 移動
                await rename(sourcePath, destPath);
            }

            // プロジェクトメタデータの再スキャン
            await scanProjectMetadata();

            // 表示の更新
            if (projectPath && projectPath !== '未選択') {
                const updatedFiles = await loadFiles(projectPath);
                setFiles(updatedFiles);
            }
        } catch (err) {
            console.error('D&D operation failed:', err);
        }
    };

    const renderNode = (node: FileNode, depth = 0) => {
        const isDirectory = node.isDirectory;
        const ChevronIcon = isDirectory ? (node.isOpen ? ChevronDown : ChevronRight) : null;

        return (
            <div key={node.path}>
                <div
                    className={`file-node ${isDirectory ? 'directory' : 'file'} type-${node.documentType} ${activeFilePath === node.path ? 'active' : ''} ${dragOverPath === node.path ? 'drop-target' : ''}`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => isDirectory ? toggleFolder(node) : openDocument(node.path)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, node)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, node)}
                >
                    {ChevronIcon && <ChevronIcon size={14} className="folder-chevron" />}
                    {!ChevronIcon && <div className="chevron-spacer" />}
                    <DocumentIcon
                        type={node.documentType}
                        isFolder={isDirectory}
                        isOpen={node.isOpen}
                        size={16}
                        className={`file-icon type-${node.documentType}`}
                    />
                    <span className="file-name">{node.name}</span>
                </div>
                {isDirectory && node.isOpen && node.children && (
                    <div className="folder-children">
                        {node.children.map((child: FileNode) => renderNode(child, depth + 1))}
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
        <div className="file-explorer" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e)}>
            <div className="file-explorer-content">
                {files.map((file: FileNode) => renderNode(file))}
            </div>
        </div>
    );
};
