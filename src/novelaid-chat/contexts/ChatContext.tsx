import React, { createContext, useContext, useState, useCallback } from 'react';
import { AiMessage, AiStreamChunk } from '../../novelaid-ai/types';
import { useAiModule } from '../../novelaid-ai/contexts/AiContext';

interface ChatContextType {
    messages: AiMessage[];
    sendMessage: (text: string) => Promise<void>;
    clearMessages: () => void;
    isGenerating: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const { getDriver, getContextData, activePersona, settings } = useAiModule();

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isGenerating) return;

        setIsGenerating(true);

        try {
            // AIコンテキスト（参照ファイル）の取得
            const contextFiles = await getContextData();
            let contextPrompt = "";
            if (contextFiles.length > 0) {
                contextPrompt = "以下の参照情報に基づいて回答してください：\n\n";
                contextFiles.forEach(file => {
                    contextPrompt += `--- FILE: ${file.name} (Path: ${file.path}) ---\n${file.content}\n\n`;
                });
                contextPrompt += "--- 参照情報終了 ---\n\n";
            }

            const userMessage: AiMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: text,
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

            const driver = getDriver();
            const providerName = settings.activeProvider;

            // コンテキストを注入したメッセージを構築（履歴には含めず、現在送信分のみ）
            const chatMessages = [
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user' as const, content: contextPrompt + text }
            ];

            const stream = await driver.streamText({
                system: activePersona.systemPrompt,
                messages: chatMessages,
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
                }

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    newMessages[lastIdx] = {
                        ...newMessages[lastIdx],
                        content: accumulatedText,
                        thought: accumulatedThought
                    };
                    return newMessages;
                });
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            
            const errorMessage = error.message || String(error);
            let displayError = `エラーが発生しました: ${errorMessage}`;
            
            if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
                displayError = `AIへの接続に失敗しました。設定（APIキーやエンドポイント）や、ローカルモデル（LM Studio等）を使用している場合はその起動状態を確認してください。\n\n詳細: ${errorMessage}`;
            }

            setMessages(prev => {
                const newMessages = [...prev];
                // 既にアシスタントのメッセージが追加されているか確認
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                    newMessages[lastIdx] = {
                        ...newMessages[lastIdx],
                        content: displayError,
                        metadata: { ...newMessages[lastIdx].metadata, isError: true }
                    };
                } else {
                    // 追加されていない場合は新規追加（コンテキスト取得エラー時など）
                    newMessages.push({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: displayError,
                        timestamp: Date.now(),
                        metadata: { isError: true }
                    });
                }
                return newMessages;
            });
        } finally {
            setIsGenerating(false);
        }
    }, [messages, isGenerating, getDriver, getContextData, activePersona]);

    return (
        <ChatContext.Provider value={{ messages, sendMessage, clearMessages, isGenerating }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatModule = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatModule must be used within a ChatProvider');
    }
    return context;
};
