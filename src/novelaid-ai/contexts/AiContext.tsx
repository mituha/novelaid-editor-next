import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AiProvider, ProviderSettings, AiModuleSettings, AllAiProviderSettings, AiDriver, createAiDriver } from '../types';
import { ConfigService } from '../../services/configService';

interface AiContextType {
    settings: AiModuleSettings;
    updateProvider: (provider: AiProvider) => Promise<void>;
    updateProviderSettings: (settings: ProviderSettings) => Promise<void>;
    getDriver: () => AiDriver;
    isLoading: boolean;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

const DEFAULT_AI_SETTINGS: AiModuleSettings = {
    activeProvider: 'gemini',
    providers: {
        gemini: { apiKey: '', endpoint: '', model: 'gemini-2.0-flash' },
        openai: { apiKey: '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
        lmstudio: { apiKey: '', endpoint: 'http://localhost:1234/v1', model: 'model-identifier' }
    }
};

export const AiProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AiModuleSettings>(DEFAULT_AI_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            // 現在は settings.json の一部として保存されているため、ConfigService を通じて取得
            // 将来的に ai-settings.json などに分離することも可能
            const appConfig = await ConfigService.loadAppConfig();
            const savedSettings = appConfig.settings as any;
            
            if (savedSettings.aiProvider || savedSettings.aiSettings) {
                setSettings({
                    activeProvider: savedSettings.aiProvider || DEFAULT_AI_SETTINGS.activeProvider,
                    providers: {
                        ...DEFAULT_AI_SETTINGS.providers,
                        ...(savedSettings.aiSettings || {})
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load AI settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const saveSettings = async (newSettings: AiModuleSettings) => {
        // AppContext 側の updateSettings と同期を取る必要があるため
        // ここでは単に保存処理を行う（実際には AppContext 側で一括管理されている現在は少し複雑）
        // モジュール化の第一歩として、ConfigService を直接叩いて保存する
        try {
            const appConfig = await ConfigService.loadAppConfig();
            const updatedAppSettings = {
                ...appConfig.settings,
                aiProvider: newSettings.activeProvider,
                aiSettings: newSettings.providers
            };
            await ConfigService.saveAppConfig('settings', updatedAppSettings);
        } catch (error) {
            console.error('Failed to save AI settings:', error);
        }
    };

    const updateProvider = async (provider: AiProvider) => {
        const newSettings = { ...settings, activeProvider: provider };
        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const updateProviderSettings = async (providerSettings: ProviderSettings) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [settings.activeProvider]: providerSettings
            }
        };
        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const getDriver = useCallback(() => {
        return createAiDriver(settings.activeProvider, settings.providers[settings.activeProvider]);
    }, [settings.activeProvider, settings.providers]);

    return (
        <AiContext.Provider value={{ settings, updateProvider, updateProviderSettings, getDriver, isLoading }}>
            {children}
        </AiContext.Provider>
    );
};

export const useAiModule = () => {
    const context = useContext(AiContext);
    if (context === undefined) {
        throw new Error('useAiModule must be used within an AiProvider');
    }
    return context;
};
