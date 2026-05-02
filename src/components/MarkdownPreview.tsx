import React from 'react';
import { NovelaidMarkdown } from 'novelaid-markdown';
import 'novelaid-markdown/index.css';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
    content: string;
    filePath?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, filePath }) => {
    return (
        <div className="markdown-preview-container">
            <div className="markdown-preview-content">
                <NovelaidMarkdown
                    content={content}
                    filePath={filePath}
                    className="novelaid-markdown-root"
                />
            </div>
        </div>
    );
};
