import React, { useState, useEffect } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { Tag, User, Book, Plus, X, List, MapPin, ScrollText } from 'lucide-react';
import './MetadataPanel.css';

export const MetadataPanel: React.FC = () => {
    const { activeFilePath, metadata, setMetadata } = useDocument();
    const [localMetadata, setLocalMetadata] = useState<Record<string, any>>(metadata);

    // Sync local state when external metadata changes (e.g. file switch)
    useEffect(() => {
        setLocalMetadata(metadata);
    }, [metadata]);

    if (!activeFilePath) {
        return (
            <div className="metadata-panel-empty">
                <p>ファイルを編集するとメタデータが表示されます</p>
            </div>
        );
    }

    const handleChange = (key: string, value: any) => {
        const newMetadata = { ...localMetadata, [key]: value };
        setLocalMetadata(newMetadata);
        setMetadata(newMetadata);
    };

    const handleRemoveField = (key: string) => {
        const newMetadata = { ...localMetadata };
        delete newMetadata[key];
        setLocalMetadata(newMetadata);
        setMetadata(newMetadata);
    };

    const handleAddField = () => {
        const fieldName = prompt('フィールド名を入力してください:');
        if (fieldName && !localMetadata[fieldName]) {
            handleChange(fieldName, '');
        }
    };

    const tagGroups = [
        {
            id: 'character',
            label: '登場人物',
            icon: <User size={12} />,
            tags: ['character', '登場人物', '人名', '人物', 'chara'],
            primary: 'character',
        },
        {
            id: 'location',
            label: '地名・施設',
            icon: <MapPin size={12} />,
            tags: ['location', 'places', '地名', '施設', '場所', 'place', 'geo', 'geography'],
            primary: 'location',
        },
        {
            id: 'plot',
            label: 'プロット',
            icon: <ScrollText size={12} />,
            tags: ['plot', '構成', 'プロット', '案', 'timeline', '時間軸', '年表'],
            primary: 'plot',
        },
    ];

    const toggleTagGroup = (groupId: string) => {
        const group = tagGroups.find((g) => g.id === groupId);
        if (!group) return;

        const currentTags: string[] = Array.isArray(localMetadata.tags)
            ? localMetadata.tags
            : typeof localMetadata.tags === 'string'
            ? (localMetadata.tags as string).split(',').map(s => s.trim()).filter(Boolean)
            : [];

        const hasAny = group.tags.some((t) =>
            currentTags.some((ct) => ct.toLowerCase() === t.toLowerCase())
        );
        let newTags: string[];

        if (hasAny) {
            // Remove all tags associated with this group (case-insensitive)
            const groupLower = group.tags.map((t) => t.toLowerCase());
            newTags = currentTags.filter(
                (t) => !groupLower.includes(t.toLowerCase())
            );
        } else {
            // Add primary tag
            newTags = [...currentTags, group.primary];
        }

        handleChange('tags', newTags);
    };

    const commonFields = [
        { key: 'title', label: 'タイトル', icon: <Book size={16} /> },
        { key: 'author', label: '著者', icon: <User size={16} /> },
        { key: 'description', label: '概要', icon: <List size={16} /> },
        { key: 'tags', label: 'タグ', icon: <Tag size={16} />, isArray: true },
    ];

    const customFields = Object.keys(localMetadata).filter(
        key => !commonFields.find(f => f.key === key)
    );

    const renderFieldInput = (field: any) => {
        const value = localMetadata[field.key];
        if (field.isArray) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="tag-toggle-buttons">
                        {tagGroups.map((group) => {
                            const currentTags: string[] = Array.isArray(value)
                                ? value
                                : typeof value === 'string'
                                ? (value as string).split(',').map(s => s.trim()).filter(Boolean)
                                : [];
                            const isActive = group.tags.some((t) =>
                                currentTags.some((ct) => ct.toLowerCase() === t.toLowerCase())
                            );
                            return (
                                <button
                                    key={group.id}
                                    type="button"
                                    className={`tag-toggle-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => toggleTagGroup(group.id)}
                                    title={group.label}
                                >
                                    {group.icon}
                                    <span>{group.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        value={Array.isArray(value) ? value.join(', ') : (value || '')}
                        onChange={(e) => handleChange(field.key, e.target.value.split(',').map(s => s.trim()))}
                        placeholder="タグをカンマ区切りで入力"
                    />
                </div>
            );
        }
        if (field.key === 'description') {
            return (
                <textarea
                    value={value || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    rows={3}
                />
            );
        }
        return (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
            />
        );
    };


    return (
        <div className="metadata-panel">
            <div className="metadata-content">
                {commonFields.map(field => (
                    <div key={field.key} className="metadata-field">
                        <label>
                            {field.icon}
                            <span>{field.label}</span>
                        </label>
                        {renderFieldInput(field)}
                    </div>
                ))}

                <div className="metadata-divider">カスタムフィールド</div>

                {customFields.map(key => (
                    <div key={key} className="metadata-field custom">
                        <div className="custom-field-header">
                            <label>{key}</label>
                            <button className="remove-btn" title="フィールドを削除" onClick={() => handleRemoveField(key)}>
                                <X size={14} />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={localMetadata[key] || ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                        />
                    </div>
                ))}

                <button className="add-field-btn" onClick={handleAddField}>
                    <Plus size={16} />
                    <span>フィールドを追加</span>
                </button>
            </div>
        </div>
    );
};
