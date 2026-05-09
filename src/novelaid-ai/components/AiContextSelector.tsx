import React, { useState } from 'react';
import { FileText, X, ChevronDown, ChevronRight, Plus, Box } from 'lucide-react';
import { useAiModule } from '../contexts/AiContext';
import { useDocument } from '../../contexts/DocumentContext';
import './AiContextSelector.css';

/**
 * AI コンテキスト選択器コンポーネント
 * ユーザーが AI に参照させるファイルを選択するための UI を提供します。
 */
export const AiContextSelector: React.FC = () => {
    const { 
        settings, 
        updateContextSettings, 
        addCustomPath, 
        removeCustomPath 
    } = useAiModule();
    const { 
        activeLeftItem, 
        activeRightItem, 
        openDocuments 
    } = useDocument();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const contextState = settings.context;

    const getFileName = (path: string | null) => {
        if (!path) return '';
        const doc = openDocuments.find(d => d.path === path);
        if (doc) return doc.baseName;
        return path.split(/[/\\]/).pop() || path;
    };

    const handleToggleIncludeLeft = () => {
        updateContextSettings({ includeActiveLeft: !contextState.includeActiveLeft });
    };

    const handleToggleIncludeRight = () => {
        updateContextSettings({ includeActiveRight: !contextState.includeActiveRight });
    };

    const handleToggleIncludeAll = () => {
        updateContextSettings({ includeAllOpen: !contextState.includeAllOpen });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const path = e.dataTransfer.getData('text/plain');
        if (path) {
            addCustomPath(path);
            setIsExpanded(true);
        }
    };

    const leftActivePath = activeLeftItem?.path || null;
    const rightActivePath = activeRightItem?.path || null;

    const selectedCount = 
        (contextState.includeActiveLeft && activeLeftItem ? 1 : 0) +
        (contextState.includeActiveRight && activeRightItem ? 1 : 0) +
        (contextState.includeAllOpen ? Math.max(0, openDocuments.length - (activeLeftItem ? 1 : 0) - (activeRightItem && activeRightItem.path !== activeLeftItem?.path ? 1 : 0)) : 0) +
        contextState.customPaths.length;

    return (
        <div className="ai-context-selector">
            <div className="ai-context-summary" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="expand-icon">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <Box size={14} className="icon-context" />
                <span className="summary-text">AI コンテキスト</span>
                <div className="badge">{selectedCount}</div>
            </div>

            {isExpanded && (
                <div className="ai-context-details">
                    <div className="context-section">
                        {leftActivePath && (
                            <label className="context-item">
                                <input
                                    type="checkbox"
                                    checked={contextState.includeActiveLeft}
                                    onChange={handleToggleIncludeLeft}
                                />
                                <span className="side-label">左:</span>
                                <span className="file-name" title={leftActivePath}>
                                    {getFileName(leftActivePath)}
                                </span>
                            </label>
                        )}
                        {rightActivePath && rightActivePath !== leftActivePath && (
                            <label className="context-item">
                                <input
                                    type="checkbox"
                                    checked={contextState.includeActiveRight}
                                    onChange={handleToggleIncludeRight}
                                />
                                <span className="side-label">右:</span>
                                <span className="file-name" title={rightActivePath}>
                                    {getFileName(rightActivePath)}
                                </span>
                            </label>
                        )}
                        <label className="context-item all-open">
                            <input
                                type="checkbox"
                                checked={contextState.includeAllOpen}
                                onChange={handleToggleIncludeAll}
                            />
                            <span className="all-label">その他のタブも含める</span>
                        </label>
                    </div>

                    <div
                        className={`context-custom-dropzone ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                    >
                        <div className="dropzone-header">
                            <Plus size={12} />
                            <span>ファイルを追加 (D&D)</span>
                        </div>

                        {contextState.customPaths.length > 0 && (
                            <div className="custom-file-list">
                                {contextState.customPaths.map((path) => (
                                    <div key={path} className="custom-file-item">
                                        <FileText size={12} />
                                        <span className="file-name" title={path}>
                                            {path.split(/[/\\]/).pop()}
                                        </span>
                                        <button
                                            className="remove-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomPath(path);
                                            }}
                                            title="除外"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
