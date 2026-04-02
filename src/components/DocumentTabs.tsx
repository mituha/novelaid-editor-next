import React from 'react';
import { X } from 'lucide-react';
import { useDocument } from '../contexts/DocumentContext';
import { DocumentIcon } from './DocumentIcon';
import './DocumentTabs.css';

export const DocumentTabs: React.FC = () => {
    const { 
        openDocuments, 
        activeDocumentPath, 
        switchDocument, 
        closeDocument, 
    } = useDocument();

    if (openDocuments.length === 0) {
        return null;
    }

    const getFileName = (path: string) => {
        return path.split('/').pop() || path;
    };

    return (
        <div className="document-tabs">
            <div className="tabs-container">
                {openDocuments.map((doc) => {
                    const isActive = doc.path === activeDocumentPath;
                    const fileName = getFileName(doc.path);

                    return (
                        <div
                            key={doc.path}
                            className={`document-tab ${isActive ? 'active' : ''} ${doc.isDirty ? 'dirty' : ''}`}
                            onClick={() => switchDocument(doc.path)}
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
                                    closeDocument(doc.path);
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
                {/* Future global actions for tabs could go here */}
            </div>
        </div>
    );
};
