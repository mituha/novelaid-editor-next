import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useDocument } from '../contexts/DocumentContext';
import { getMetadataCache } from 'tauri-plugin-novelaid-fs-api';
import { listen } from '@tauri-apps/api/event';
import './MetadataListPanel.css';

interface MetadataEntry {
    path: string;
    name: string;
    metadata: Record<string, any>;
}

interface ListConfig {
    id: string;
    title: string;
    tag: string;
}

interface MetadataListPanelProps {
    fixedTitle?: string;
    fixedTag?: string;
}

export const MetadataListPanel: React.FC<MetadataListPanelProps> = ({
    fixedTitle = '',
    fixedTag = '',
}) => {
    const { openDocument } = useDocument();
    const { settings, updateSettings, projectPath } = useProject();
    const [lists, setLists] = useState<ListConfig[]>(fixedTag ? [] : settings.metadataLists || []);
    const [cache, setCache] = useState<Record<string, any>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [newList, setNewList] = useState<Partial<ListConfig>>({ title: '', tag: '' });

    const fetchCache = useCallback(async () => {
        try {
            const data = await getMetadataCache();
            setCache(data || {});
        } catch (err) {
            console.error('Failed to fetch metadata cache:', err);
        }
    }, []);

    // Load initial cache and subscribe to updates
    useEffect(() => {
        fetchCache();

        let unlistenUpdate: (() => void) | null = null;
        let unlistenProgress: (() => void) | null = null;

        const setupListeners = async () => {
            try {
                unlistenUpdate = await listen<any>('fs:metadata-updated', () => {
                    fetchCache();
                });
                unlistenProgress = await listen<any>('fs:metadata-scan-progress', (event) => {
                    const { processed, total } = event.payload;
                    if (processed >= total) {
                        fetchCache();
                    }
                });
            } catch (err) {
                console.error('Failed to setup metadata listeners:', err);
            }
        };

        setupListeners();

        return () => {
            if (unlistenUpdate) unlistenUpdate();
            if (unlistenProgress) unlistenProgress();
        };
    }, [fetchCache, projectPath]);

    // Sync custom lists when settings changes
    useEffect(() => {
        if (!fixedTag) {
            setLists(settings.metadataLists || []);
        }
    }, [settings.metadataLists, fixedTag]);

    const getFilesForTags = (tagString: string): MetadataEntry[] => {
        if (!tagString) return [];
        const tags = tagString.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const results: MetadataEntry[] = [];

        for (const [filePath, meta] of Object.entries(cache)) {
            if (meta && Array.isArray(meta.tags)) {
                const hasTag = tags.some(t =>
                    meta.tags.some((mt: string) => mt.toLowerCase() === t.toLowerCase())
                );
                if (hasTag) {
                    const parts = filePath.split(/[\\/]/);
                    const baseName = parts[parts.length - 1] || '';
                    const name = meta.title || baseName.replace(/\.[^/.]+$/, "");
                    results.push({ path: filePath, name, metadata: meta });
                }
            }
        }
        return results;
    };

    const handleAddList = async () => {
        if (fixedTag || !newList.title || !newList.tag) return;
        const item: ListConfig = {
            id: Date.now().toString(),
            title: newList.title,
            tag: newList.tag,
        };
        const updated = [...lists, item];
        setLists(updated);
        await updateSettings({ metadataLists: updated });
        setNewList({ title: '', tag: '' });
    };

    const handleRemoveList = async (id: string) => {
        if (fixedTag) return;
        const updated = lists.filter((l) => l.id !== id);
        setLists(updated);
        await updateSettings({ metadataLists: updated });
    };

    const handleFileClick = async (path: string) => {
        await openDocument(path);
    };

    return (
        <div className="metadata-list-panel">
            {!fixedTag && (
                <div className="panel-header-actions">
                    <button
                        type="button"
                        className="edit-toggle-btn"
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? '完了' : 'リスト編集'}
                    </button>
                </div>
            )}

            {isEditing && !fixedTag && (
                <div className="edit-list-section">
                    <input
                        placeholder="タイトル (例: 登場人物)"
                        value={newList.title || ''}
                        onChange={(e) => setNewList({ ...newList, title: e.target.value })}
                    />
                    <input
                        placeholder="タグ (例: character)"
                        value={newList.tag || ''}
                        onChange={(e) => setNewList({ ...newList, tag: e.target.value })}
                    />
                    <button type="button" className="add-btn" onClick={handleAddList}>
                        追加
                    </button>
                </div>
            )}

            <div className="bookmark-lists">
                {fixedTag ? (
                    <div className="bookmark-section">
                        {fixedTitle && <div className="bookmark-header"><span className="bookmark-title">{fixedTitle}</span></div>}
                        <ul className="bookmark-items">
                            {getFilesForTags(fixedTag).map((entry) => (
                                <li key={entry.path}>
                                    <div
                                        className="bookmark-item-link"
                                        onClick={() => handleFileClick(entry.path)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <span className="item-icon">📄</span>
                                        <span className="item-name">{entry.name}</span>
                                    </div>
                                </li>
                            ))}
                            {getFilesForTags(fixedTag).length === 0 && (
                                <li className="empty-bookmark-msg">該当ファイルはありません</li>
                            )}
                        </ul>
                    </div>
                ) : (
                    lists.map((list) => (
                        <div key={list.id} className="bookmark-section">
                            <div className="bookmark-header">
                                <span className="bookmark-title">{list.title}</span>
                                {isEditing && (
                                    <button
                                        type="button"
                                        className="remove-list-btn"
                                        onClick={() => handleRemoveList(list.id)}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <ul className="bookmark-items">
                                {getFilesForTags(list.tag).map((entry) => (
                                    <li key={entry.path}>
                                        <div
                                            className="bookmark-item-link"
                                            onClick={() => handleFileClick(entry.path)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <span className="item-icon">📄</span>
                                            <span className="item-name">{entry.name}</span>
                                        </div>
                                    </li>
                                ))}
                                {getFilesForTags(list.tag).length === 0 && (
                                    <li className="empty-bookmark-msg">該当ファイルはありません</li>
                                )}
                            </ul>
                        </div>
                    ))
                )}

                {!fixedTag && lists.length === 0 && !isEditing && (
                    <div className="empty-panel-msg">
                        「リスト編集」から収集対象を追加してください。
                    </div>
                )}
            </div>
        </div>
    );
};
