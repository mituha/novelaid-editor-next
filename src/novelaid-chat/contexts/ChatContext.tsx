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
    const { getDriver } = useAiModule();

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isGenerating) return;

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
        setIsGenerating(true);

        try {
            const driver = getDriver();
            // 履歴を渡す (システムプロンプト等は将来的に設定可能に)
            const chatHistory = messages.concat(userMessage);
            
            const stream = await driver.streamText({
                messages: chatHistory,
                enableThinking: true // 思考プロセスを有効化
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
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    content: 'エラーが発生しました。接続設定を確認してください。'
                };
                return newMessages;
            });
        } finally {
            setIsGenerating(false);
        }
    }, [messages, isGenerating, getDriver]);

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
