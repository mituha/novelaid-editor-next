import React from 'react';
import { X, Columns2 } from 'lucide-react';
import { useDocument } from '../contexts/DocumentContext';
import { DocumentIcon } from './DocumentIcon';
import './DocumentTabs.css';

interface DocumentTabsProps {
    pane: 'left' | 'right';
}

export const DocumentTabs: React.FC<DocumentTabsProps> = ({ pane }) => {
    const { 
        openDocuments, 
        activeLeftPath, 
        activeRightPath,
        switchDocument, 
        closeDocument, 
        toggleSplit,
        isSplit,
        activePane,
        setActivePane
    } = useDocument();

    const activeDocumentPath = pane === 'left' ? activeLeftPath : activeRightPath;
    const filteredDocuments = openDocuments.filter(doc => 
        pane === 'left' ? doc.isInLeft : doc.isInRight
    );

    if (filteredDocuments.length === 0 && !isSplit) {
        return null;
    }

    const getFileName = (path: string) => {
        return path.split('/').pop() || path;
    };

    return (
        <div className={`document-tabs ${isSplit && activePane === pane ? 'focused' : ''}`}>
            <div className="tabs-container">
                {filteredDocuments.map((doc) => {
                    const isActive = doc.path === activeDocumentPath;
                    const fileName = getFileName(doc.path);

                    return (
                        <div
                            key={doc.path}
                            className={`document-tab ${isActive ? 'active' : ''} ${doc.isDirty ? 'dirty' : ''}`}
                            onClick={() => {
                                switchDocument(doc.path, pane);
                                setActivePane(pane);
                            }}
                            title={doc.path}
                        >
                            <DocumentIcon
                                type={doc.documentType}
                                isFolder={false}
                                size={14}
                                className="tab-icon"
                            />
                            <span className="tab-title">{fileName}</span>
                            
                            {doc.isDirty && (
                                <div className="dirty-indicator" title="未保存の変更があります" />
                            )}
                            
                            <button
                                className="tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeDocument(doc.path, pane);
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
            </div>
        </div>
    );
};

