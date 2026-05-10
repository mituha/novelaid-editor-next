import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AiProvider, ProviderSettings, AiModuleSettings, AllAiProviderSettings, AiDriver, createAiDriver, AiContextSettings } from '../types';
import { ConfigService } from '../../services/configService';
import { readDocument } from 'tauri-plugin-novelaid-fs-api';
import { useDocument } from '../../contexts/DocumentContext';
import { AiPersona } from 'restar-ai';
import { builtinPersonas } from '../persona/builtin';

interface AiContextType {
    settings: AiModuleSettings;
    updateProvider: (provider: AiProvider) => Promise<void>;
    updateProviderSettings: (settings: ProviderSettings) => Promise<void>;
    updateContextSettings: (settings: Partial<AiContextSettings>) => void;
    addCustomPath: (path: string) => void;
    removeCustomPath: (path: string) => void;
    getDriver: () => AiDriver;
    getContextData: () => Promise<{ path: string; name: string; content: string }[]>;
    // ペルソナ関連
    personas: AiPersona[];
    activePersonaId: string;
    activePersona: AiPersona;
    setActivePersona: (id: string) => void;
    isLoading: boolean;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

const DEFAULT_AI_SETTINGS: AiModuleSettings = {
    activeProvider: 'gemini',
    providers: {
        gemini: { apiKey: '', endpoint: '', model: 'gemini-2.0-flash' },
        openai: { apiKey: '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
        lmstudio: { apiKey: '', endpoint: 'http://localhost:1234/v1', model: 'model-identifier' }
    },
    context: {
        includeActiveLeft: true,
        includeActiveRight: false,
        includeAllOpen: false,
        customPaths: []
    }
};

export const AiProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AiModuleSettings>(DEFAULT_AI_SETTINGS);
    const [activePersonaId, setActivePersonaIdState] = useState<string>('default');
    const [isLoading, setIsLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            // 現在は settings.json の一部として保存されているため、ConfigService を通じて取得
            // 将来的に ai-settings.json などに分離することも可能
            const appConfig = await ConfigService.loadAppConfig();
            const savedSettings = appConfig.settings as any;
            
            if (savedSettings.aiProvider || savedSettings.aiSettings || savedSettings.aiContext) {
                setSettings({
                    activeProvider: savedSettings.aiProvider || DEFAULT_AI_SETTINGS.activeProvider,
                    providers: {
                        ...DEFAULT_AI_SETTINGS.providers,
                        ...(savedSettings.aiSettings || {})
                    },
                    context: savedSettings.aiContext || DEFAULT_AI_SETTINGS.context
                });
            }
            if (savedSettings.activePersonaId) {
                setActivePersonaIdState(savedSettings.activePersonaId);
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
                aiSettings: newSettings.providers,
                aiContext: newSettings.context,
                activePersonaId: activePersonaId
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

    const updateContextSettings = useCallback((newContextSettings: Partial<AiContextSettings>) => {
        const newSettings = {
            ...settings,
            context: { ...settings.context, ...newContextSettings }
        };
        setSettings(newSettings);
        saveSettings(newSettings);
    }, [settings]);

    const addCustomPath = useCallback((path: string) => {
        if (settings.context.customPaths.includes(path)) return;
        updateContextSettings({
            customPaths: [...settings.context.customPaths, path]
        });
    }, [settings.context.customPaths, updateContextSettings]);

    const removeCustomPath = useCallback((path: string) => {
        updateContextSettings({
            customPaths: settings.context.customPaths.filter(p => p !== path)
        });
    }, [settings.context.customPaths, updateContextSettings]);

    const getDriver = useCallback(() => {
        return createAiDriver(settings.activeProvider, settings.providers[settings.activeProvider]);
    }, [settings.activeProvider, settings.providers]);

    const { activeLeftItem, activeRightItem, openDocuments } = useDocument();

    const getContextData = useCallback(async () => {
        const { context } = settings;
        const results: { path: string; name: string; content: string }[] = [];
        const pathsToRead = new Set<string>();

        if (context.includeActiveLeft && activeLeftItem) pathsToRead.add(activeLeftItem.path);
        if (context.includeActiveRight && activeRightItem) pathsToRead.add(activeRightItem.path);
        if (context.includeAllOpen) {
            openDocuments.forEach(doc => pathsToRead.add(doc.path));
        }
        context.customPaths.forEach(path => pathsToRead.add(path));

        for (const path of pathsToRead) {
            const openDoc = openDocuments.find(d => d.path === path);
            if (openDoc) {
                results.push({ path, name: openDoc.baseName, content: openDoc.content });
            } else {
                try {
                    const doc = await readDocument(path);
                    results.push({ path, name: doc.baseName, content: doc.content });
                } catch (e) {
                    console.warn(`Failed to read context file: ${path}`, e);
                }
            }
        }
        return results;
    }, [settings.context, activeLeftItem, activeRightItem, openDocuments]);

    const activePersona = builtinPersonas.find(p => p.id === activePersonaId) || builtinPersonas[0];

    const setActivePersona = useCallback(async (id: string) => {
        setActivePersonaIdState(id);
        try {
            const appConfig = await ConfigService.loadAppConfig();
            const updatedAppSettings = {
                ...appConfig.settings,
                activePersonaId: id
            };
            await ConfigService.saveAppConfig('settings', updatedAppSettings);
        } catch (error) {
            console.error('Failed to save active persona:', error);
        }
    }, []);

    return (
        <AiContext.Provider value={{ 
            settings, 
            updateProvider, 
            updateProviderSettings, 
            updateContextSettings,
            addCustomPath,
            removeCustomPath,
            getDriver, 
            getContextData,
            personas: builtinPersonas,
            activePersonaId,
            activePersona,
            setActivePersona,
            isLoading 
        }}>
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
