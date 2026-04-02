import React from 'react';
import { useDocument } from '../contexts/DocumentContext';
import { DocumentTabs } from './DocumentTabs';
import { Editor } from './Editor';
import './DocumentPane.css';

interface DocumentPaneProps {
    pane: 'left' | 'right';
    flex?: number;
}

export const DocumentPane: React.FC<DocumentPaneProps> = ({ pane, flex }) => {
    const { isSplit, activePane, setActivePane } = useDocument();
    const isFocused = isSplit && activePane === pane;

    return (
        <div 
            className={`pane-container ${pane} ${isFocused ? 'focused' : ''}`}
            onClick={() => isSplit && setActivePane(pane)}
            style={flex !== undefined ? { flex } : undefined}
        >
            <DocumentTabs pane={pane} />
            <div className="editor-content">
                <Editor pane={pane} />
            </div>
        </div>
    );
};
