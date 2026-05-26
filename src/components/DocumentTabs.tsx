import React, { useState } from 'react';
import { X, Columns2, Eye } from 'lucide-react';
import { useDocument } from '../contexts/DocumentContext';
import { DocumentIcon } from './DocumentIcon';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import './DocumentTabs.css';

interface DocumentTabsProps {
    pane: 'left' | 'right';
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({ pane }) => {
    const { 
        openDocuments, 
        activeLeftItem, 
        activeRightItem,
        switchDocument, 
        closeDocument, 
        closeOtherDocuments,
        closeAllDocuments,
        toggleSplit,
        isSplit,
        activePane,
        setActivePane,
        openDocument
    } = useDocument();

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, item: any) => {
        e.preventDefault();
        e.stopPropagation();

        const menuItems: ContextMenuItem[] = [
            {
                label: '閉じる',
                onClick: () => closeDocument(item.path, pane, item.isPreview)
            },
            {
                label: 'その他を閉じる',
                onClick: () => closeOtherDocuments(item.path, pane, item.isPreview)
            },
            {
                label: 'すべて閉じる',
                onClick: () => closeAllDocuments(pane)
            }
        ];

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: menuItems
        });
    };

    const activeItem = pane === 'left' ? activeLeftItem : activeRightItem;
    
    const tabItems = openDocuments.reduce((acc, doc) => {
        const mainView = pane === 'left' ? doc.leftMainView : doc.rightMainView;
        const previewView = pane === 'left' ? doc.leftPreviewView : doc.rightPreviewView;
        
        if (mainView !== 'none') {
            acc.push({ 
                path: doc.path, 
                baseName: doc.baseName,
                fileTitle: doc.fileTitle,
                isPreview: false, 
                documentType: doc.documentType, 
                isDirty: doc.isDirty 
            });
        }
        if (previewView !== 'none') {
            acc.push({ 
                path: doc.path, 
                baseName: doc.baseName,
                fileTitle: doc.fileTitle,
                isPreview: true, 
                documentType: doc.documentType, 
                isDirty: doc.isDirty 
            });
        }
        return acc;
    }, [] as any[]);

    if (tabItems.length === 0 && !isSplit) {
        return null;
    }


    return (
        <div className={`document-tabs ${isSplit && activePane === pane ? 'focused' : ''}`}>
            <div className="tabs-container">
                {tabItems.map((item) => {
                    const isActive = item.path === activeItem?.path && item.isPreview === activeItem?.isPreview;
                    const fileName = item.baseName + (item.isPreview ? ' (Preview)' : '');
                    const key = `${item.path}-${item.isPreview ? 'preview' : 'main'}`;

                    return (
                        <div
                            key={key}
                            className={`document-tab ${isActive ? 'active' : ''} ${item.isDirty && !item.isPreview ? 'dirty' : ''}`}
                            onClick={() => {
                                switchDocument(item.path, pane, item.isPreview);
                                setActivePane(pane);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            title={item.path}
                        >
                            <DocumentIcon
                                type={item. documentType}
                                isFolder={false}
                                size={14}
                                className="tab-icon"
                            />
                            <span className="tab-title">{fileName}</span>
                            
                            {item.isDirty && !item.isPreview && (
                                <div className="dirty-indicator" title="未保存の変更があります" />
                            )}
                            
                            <button
                                className="tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeDocument(item.path, pane, item.isPreview);
                                }}
                                title="閉じる"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="tabs-actions">
                <button 
                    className={`action-button ${isSplit ? 'active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleSplit();
                    }}
                    title={isSplit ? "分割を解除" : "左右に分割"}
                >
                    <Columns2 size={16} />
                </button>
                {activeItem && !activeItem.isPreview && (
                    <button
                        className="action-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isSplit) {
                                toggleSplit();
                                openDocument(activeItem.path, 'right', true);
                            } else {
                                const targetPane = pane === 'left' ? 'right' : 'left';
                                openDocument(activeItem.path, targetPane, true);
                            }
                        }}
                        title="プレビューを表示"
                    >
                        <Eye size={16} />
                    </button>
                )}
            </div>
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};

