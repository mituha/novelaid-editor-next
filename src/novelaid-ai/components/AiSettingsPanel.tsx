import React from 'react';
import { AiSettings } from 'restar-ai';
import { useAiModule } from '../contexts/AiContext';
import 'restar-ai/index.css';

/**
 * AI 設定パネルコンポーネント
 * AiContext と連携して設定の表示と更新を行います。
 */
export const AiSettingsPanel: React.FC = () => {
    const { settings, updateProvider, updateProviderSettings, isLoading } = useAiModule();

    if (isLoading) {
        return <div>Loading AI settings...</div>;
    }

    return (
        <div className="novelaid-ai-settings-panel">
            <AiSettings
                provider={settings.activeProvider}
                settings={settings.providers[settings.activeProvider]}
                onProviderChange={updateProvider}
                onSettingsChange={updateProviderSettings}
            />
        </div>
    );
};
