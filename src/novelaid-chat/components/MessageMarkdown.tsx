import React from 'react';
import { NovelaidMarkdown } from 'novelaid-markdown';
import 'novelaid-markdown/index.css';
import './MessageMarkdown.css';

interface MessageMarkdownProps {
    content: string;
    className?: string;
}

/**
 * チャットメッセージ等のバブル内で表示するためのマークダウンコンポーネント。
 * NovelaidMarkdownをベースにし、チャット向けのスタイル調整を行っています。
 */
export const MessageMarkdown: React.FC<MessageMarkdownProps> = ({ content, className = '' }) => {
    return (
        <div className={`message-markdown-container ${className}`}>
            <NovelaidMarkdown
                content={content}
                className="message-markdown-root"
            />
        </div>
    );
};
