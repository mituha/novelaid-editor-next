import React, { useState } from 'react';
import { AiChatInput } from 'restar-ai';
import { MessageMarkdown } from '../../novelaid-chat/components/MessageMarkdown';
import { useConlangs } from '../hooks/useConlangs';
import { Conlang } from '../types';
import { ConlangCreateModal } from './ConlangCreateModal';
import { ConlangDetails } from './ConlangDetails';
import { Bot, User, AlertCircle, Languages, Plus, RefreshCw } from 'lucide-react';
import './ConlangPanel.css';

export const ConlangPanel: React.FC = () => {
  const { conlangs, isLoading, error, loadConlangs, generationProgress, generateConlang } = useConlangs();
  const [selectedLang, setSelectedLang] = useState<Conlang | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 生成中・対話用のメッセージリスト
  const [messages, setMessages] = useState<{ id: string; role: 'assistant' | 'user'; content: string; type?: string; error?: string }[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // 自動スクロール
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  React.useEffect(() => {
    if (generationProgress) {
      setMessages(prev => {
        // 同じステップのログがあれば更新、なければ追加
        const existingIdx = prev.findIndex(m => m.id === generationProgress.step);
        if (existingIdx !== -1) {
          const newMessages = [...prev];
          newMessages[existingIdx] = { ...newMessages[existingIdx], content: generationProgress.message };
          return newMessages;
        }
        return [...prev, { 
          id: generationProgress.step, 
          role: 'assistant',
          content: generationProgress.message,
          type: generationProgress.step
        }];
      });
    }
  }, [generationProgress]);

  // エラー表示の同期
  React.useEffect(() => {
    if (error) {
      setMessages(prev => [
        ...prev, 
        { id: crypto.randomUUID(), role: 'assistant', content: '', error }
      ]);
    }
  }, [error]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    
    // 将来的なチャット処理のプレースホルダ
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: '現在、生成後のチャットによる調整機能を準備中です。生成された言語の設定を確認するには、リストから言語を選択してください。' 
      }]);
    }, 1000);
  };

  return (
    <div className="novelaid-conlang-panel">
      <div className="conlang-toolbar">
        <button className="create-btn" onClick={() => setIsCreateModalOpen(true)} disabled={isLoading}>
          <Plus size={16} />
          <span>新規言語を作成</span>
        </button>
        <button className="icon-btn" onClick={loadConlangs} title="リフレッシュ">
          <RefreshCw size={16} className={isLoading && !generationProgress ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="conlang-content" ref={scrollRef}>
        {(isLoading && generationProgress) || messages.length > 0 ? (
          <div className="conlang-chat-view">
            <div className="message-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-item ${msg.role} ${msg.error ? 'error' : ''}`}>
                  <div className="message-icon">
                    {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-content">
                      {msg.error ? (
                        <div className="error-container">
                          <AlertCircle size={14} />
                          <span>{msg.error}</span>
                        </div>
                      ) : (
                        <MessageMarkdown content={msg.content} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && generationProgress && (
                <div className="generation-status-mini">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>構築中... ({generationProgress.percentage}%)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="conlang-list">
            {conlangs.length === 0 && !isLoading ? (
              <div className="conlang-empty">
                <Languages size={48} />
                <p>架空言語がまだありません。<br/>AIと一緒に作成しましょう！</p>
              </div>
            ) : (
              conlangs.map(lang => (
                <div 
                  key={lang.id} 
                  className={`conlang-item ${selectedLang?.id === lang.id ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  <div className="conlang-icon">
                    <Languages size={18} />
                  </div>
                  <div className="conlang-info">
                    <div className="conlang-name">{lang.name}</div>
                    <div className="conlang-summary">
                      {lang.purposeConcept || '未設定'}
                      {lang.metadata?.status !== 'complete' && (
                        <span className="status-badge incomplete">未完了</span>
                      )}
                    </div>
                  </div>
                  <div className="conlang-item-actions">
                    {lang.metadata?.status !== 'complete' && (
                      <button 
                        className="action-btn retry" 
                        onClick={(e) => {
                          e.stopPropagation();
                          generateConlang(lang.generationParams, lang);
                        }}
                        title="生成を再開"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="conlang-input-wrapper">
        <AiChatInput 
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isStreaming={isLoading}
          disabled={isLoading && !generationProgress}
          placeholder="AI に言語について相談する..."
        />
      </div>

      {selectedLang && (
        <ConlangDetails 
          conlang={selectedLang} 
          onClose={() => setSelectedLang(null)} 
        />
      )}

      {isCreateModalOpen && (
        <ConlangCreateModal 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
};
