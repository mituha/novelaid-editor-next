import React, { useEffect, useRef } from 'react';
import { AiChatInput } from 'restar-ai';
import { useChatModule } from '../contexts/ChatContext';
import { AiContextSelector } from '../../novelaid-ai/components/AiContextSelector';
import { PersonaSelector } from '../../novelaid-ai/components/PersonaSelector';
import { MessageMarkdown } from './MessageMarkdown';
import { ChevronDown, ChevronUp, Bot, User, Trash2, AlertCircle } from 'lucide-react';
import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
    const { messages, sendMessage, clearMessages, isGenerating } = useChatModule();
    const [inputValue, setInputValue] = React.useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (inputValue.trim() && !isGenerating) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    // 新しいメッセージが来たら自動スクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="novelaid-chat-panel">
            <div className="chat-toolbar">
                <PersonaSelector />
                <div className="toolbar-spacer" style={{ flex: 1 }}></div>
                <button className="icon-btn" onClick={clearMessages} title="チャット履歴を消去">
                    <Trash2 size={16} />
                </button>
            </div>
            
            <div className="message-list" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <Bot size={48} />
                        <p>AI アシスタントに相談してみましょう。</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={msg.id} className={`message-item ${msg.role} ${msg.error ? 'error' : ''}`}>
                        <div className="message-icon">
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className="message-content-wrapper">
                            {msg.thought && (
                                <details className="message-thought">
                                    <summary>思考プロセスを表示</summary>
                                    <div className="thought-content">{msg.thought}</div>
                                </details>
                            )}
                            <div className="message-content">
                                {msg.error ? (
                                    <div className="error-container">
                                        <div className="error-header">
                                            <AlertCircle size={14} />
                                            <span>エラー</span>
                                        </div>
                                        <div className="error-text">{msg.error}</div>
                                    </div>
                                ) : msg.role === 'assistant' && !msg.content && isGenerating && idx === messages.length - 1 ? (
                                    <div className="loading-indicator">
                                        <div className="dot-pulse"></div>
                                        <span>考え中...</span>
                                    </div>
                                ) : (
                                    <MessageMarkdown content={typeof msg.content === 'string' ? msg.content : '複雑なコンテンツは未対応'} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="chat-input-wrapper">
                <AiChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    isStreaming={isGenerating}
                    disabled={isGenerating}
                    placeholder="AI にメッセージを送信..."
                />
                <div className="chat-context-area">
                    <AiContextSelector />
                </div>
            </div>
        </div>
    );
};
