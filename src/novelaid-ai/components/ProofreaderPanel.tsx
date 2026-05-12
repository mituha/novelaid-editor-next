import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    SpellCheck, 
    Activity, 
    Repeat, 
    Eye, 
    ShieldAlert, 
    FileText, 
    SearchCheck,
    AlertCircle,
    User,
    Bot
} from 'lucide-react';
import { AiChatInput } from 'restar-ai';
import { useAiModule } from '../contexts/AiContext';
import { useDocument } from '../../contexts/DocumentContext';
import { AiContextSelector } from './AiContextSelector';
import { MessageMarkdown } from '../../novelaid-chat/components/MessageMarkdown';
import { AiMessage } from '../types';
import './ProofreaderPanel.css';

interface ProofreadingAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    prompt: string;
    personaId: 'proofreader' | 'editor';
}

const ACTIONS: ProofreadingAction[] = [
    {
        id: 'typo',
        label: '誤字脱字',
        icon: <SpellCheck size={16} />,
        personaId: 'proofreader',
        prompt: '以下の文章の誤字脱字、送り仮名のミス、重複表現等を指摘し、修正案と修正理由を簡潔に提示してください。'
    },
    {
        id: 'style',
        label: '文体・リズム',
        icon: <Activity size={16} />,
        personaId: 'proofreader',
        prompt: '以下の文章の文体（ですます調、だである調の混在）、文章のリズム、語彙の適切さを分析し、改善案を提案してください。'
    },
    {
        id: 'repetitive',
        label: '語彙・文末重複',
        icon: <Repeat size={16} />,
        personaId: 'proofreader',
        prompt: '短い範囲での語彙の重複や、同じ文末表現（〜た、〜だ等）の連続を検出し、文章が単調にならないための修正案を提示してください。'
    },
    {
        id: 'pov',
        label: '視点ブレチェック',
        icon: <Eye size={16} />,
        personaId: 'editor',
        prompt: 'このシーンにおける視点（POV）が一定に保たれているか、あるいは意図しない視点の混濁（神の視点の混入など）がないかを分析し、指摘してください。'
    },
    {
        id: 'contradiction',
        label: '設定矛盾確認',
        icon: <ShieldAlert size={16} />,
        personaId: 'editor',
        prompt: '提供されたテキストと参照情報の範囲内で、キャラクターの行動、設定、時系列などの矛盾がないかを確認してください。'
    },
    {
        id: 'critic',
        label: '編集者講評',
        icon: <FileText size={16} />,
        personaId: 'editor',
        prompt: 'プロの小説編集者の視点から、プロット、キャラクターの魅力、文章力を多角的に評価し、具体的な講評とアドバイスを行ってください。'
    }
];

export const ProofreaderPanel: React.FC = () => {
    const { getDriver, getContextData, personas } = useAiModule();
    const { content, activeItem } = useDocument();
    
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自動スクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const startAiProcess = useCallback(async (prompt: string, personaId: string) => {
        if (isGenerating) return;

        setIsGenerating(true);
        
        try {
            const persona = personas.find(p => p.id === personaId) || personas[0];
            const driver = getDriver();
            
            // コンテキストデータの取得（設定矛盾確認などで重要）
            const contextFiles = await getContextData();
            let contextPrompt = "";
            if (contextFiles.length > 0) {
                contextPrompt = "【参照情報】\n";
                contextFiles.forEach(file => {
                    contextPrompt += `--- FILE: ${file.name} ---\n${file.content}\n\n`;
                });
                contextPrompt += "【参照情報終了】\n\n";
            }

            const userMessage: AiMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: prompt,
                timestamp: Date.now()
            };

            const assistantMessage: AiMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                thought: '',
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, userMessage, assistantMessage]);

            const fullPrompt = contextPrompt + "【対象テキスト】\n" + content + "\n\n" + prompt;

            const stream = await driver.streamText({
                system: persona.systemPrompt,
                messages: [
                    ...messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
                    { role: 'user', content: fullPrompt }
                ],
                enableThinking: true
            });

            const reader = stream.getReader();
            let accumulatedText = '';
            let accumulatedThought = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (value.type === 'text') {
                    accumulatedText += value.content;
                } else if (value.type === 'thought') {
                    accumulatedThought += value.content;
                } else if (value.type === 'error') {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].error = value.content;
                        return newMessages;
                    });
                    break;
                }

                setMessages(prev => {
                    const newMessages = [...prev];
                    const last = newMessages[newMessages.length - 1];
                    last.content = accumulatedText;
                    last.thought = accumulatedThought;
                    return newMessages;
                });
            }

        } catch (error: any) {
            console.error('AI Proofreading failed:', error);
            const errorMessage = error.message || String(error);
            setMessages(prev => {
                const newMessages = [...prev];
                const last = newMessages[newMessages.length - 1];
                if (last && last.role === 'assistant') {
                    last.error = `エラーが発生しました: ${errorMessage}`;
                } else {
                    newMessages.push({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: '',
                        error: `エラーが発生しました: ${errorMessage}`,
                        timestamp: Date.now()
                    });
                }
                return newMessages;
            });
        } finally {
            setIsGenerating(false);
        }
    }, [content, getDriver, getContextData, personas, messages, isGenerating]);

    const handleAction = (action: ProofreadingAction) => {
        if (!content.trim()) return;
        const displayPrompt = `${action.label}を開始しました。`;
        
        // メッセージ履歴に表示用として追加し、実際のプロンプトをAIに投げる
        startAiProcess(action.prompt, action.personaId);
    };

    const handleSend = () => {
        if (!inputValue.trim() || isGenerating) return;
        
        const text = inputValue;
        setInputValue('');
        startAiProcess(text, 'proofreader'); // デフォルトは校正者でフォローアップ
    };

    return (
        <div className="novelaid-proofreader-panel">
            <div className="proofreader-actions">
                {ACTIONS.map(action => (
                    <button 
                        key={action.id}
                        className="action-btn"
                        onClick={() => handleAction(action)}
                        disabled={isGenerating || !content.trim()}
                        title={action.prompt}
                    >
                        {action.icon}
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>

            <div className="proofreader-results" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="proofreader-empty">
                        <SearchCheck size={48} />
                        <p>校正アクションを選択するか、質問を入力してください。</p>
                        {!content.trim() && <p style={{ fontSize: '11px', color: 'var(--error-color)' }}>※対象となる文章がありません</p>}
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={msg.id} className={`message-item ${msg.role}`}>
                            {msg.thought && (
                                <details className="message-thought">
                                    <summary>思考プロセスを表示</summary>
                                    <div className="thought-content">{msg.thought}</div>
                                </details>
                            )}
                            <div className="message-bubble">
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
                                    <MessageMarkdown content={typeof msg.content === 'string' ? msg.content : 'コンテンツエラー'} />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="proofreader-input-wrapper">
                <AiChatInput 
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    isStreaming={isGenerating}
                    disabled={isGenerating || !content.trim()}
                    placeholder="校正結果について質問する..."
                />
                <div className="chat-context-area">
                    <AiContextSelector />
                </div>
            </div>
        </div>
    );
};
