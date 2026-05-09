import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, AppSettings, AppSession, AppState } from '../types/config';
import { ConfigService } from '../services/configService';
import { getName, getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface AppContextType {
    config: AppConfig;
    settings: AppSettings;
    session: AppSession;
    state: AppState;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    updateSession: (session: Partial<AppSession>) => Promise<void>;
    addRecentProject: (name: string, path: string) => Promise<void>;
    removeRecentProject: (path: string) => Promise<void>;
    updateState: (state: Partial<AppState>) => Promise<void>;
    setProjectTitle: (title: string | null) => void;
    isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig>({ name: 'novelaid-editor-next', version: '0.2.0' });
    const [settings, setSettings] = useState<AppSettings>({ 
        theme: 'system', 
        language: 'ja',
        aiProvider: 'gemini',
        aiSettings: {
            gemini: { apiKey: '', endpoint: '', model: 'gemini-2.0-flash' },
            openai: { apiKey: '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
            lmstudio: { apiKey: '', endpoint: 'http://localhost:1234/v1', model: 'model-identifier' }
        }
    });
    const [session, setSession] = useState<AppSession>({ lastProjectPath: null, lastOpenedFiles: [], recentProjects: [] });
    const [state, setState] = useState<AppState>({ windowSize: { width: 1200, height: 800 }, sidebarWidth: 260 });
    const [projectTitle, setProjectTitle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fullConfig, name, version] = await Promise.all([
                ConfigService.loadAppConfig(),
                getName(),
                getVersion()
            ]);
            setConfig({ ...fullConfig.config, name, version });
            setSettings(prev => ({ ...prev, ...fullConfig.settings }));
            setSession(prev => ({ ...prev, ...fullConfig.session }));
            setState(prev => ({ ...prev, ...fullConfig.state }));
        } catch (error) {
            console.error('Failed to load app config:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        await ConfigService.saveAppConfig('settings', updated);
    };

    const updateSession = async (newSession: Partial<AppSession>) => {
        const updated = { ...session, ...newSession };
        setSession(updated);
        await ConfigService.saveAppConfig('session', updated);
    };

    const addRecentProject = async (name: string, path: string) => {
        const others = (session.recentProjects || []).filter(p => p.path !== path);
        const updated = [{ name, path }, ...others].slice(0, 10);
        await updateSession({ recentProjects: updated });
    };

    const removeRecentProject = async (path: string) => {
        const updated = (session.recentProjects || []).filter(p => p.path !== path);
        await updateSession({ recentProjects: updated });
    };

    const updateState = async (newState: Partial<AppState>) => {
        const updated = { ...state, ...newState };
        setState(updated);
        await ConfigService.saveAppConfig('state', updated);
    };

    // Window title management
    useEffect(() => {
        const updateTitle = async () => {
            if (!config.name || !config.version) return;

            let title = `${config.name} v${config.version}`;
            if (projectTitle) {
                title = `${title} - ${projectTitle}`;
            }

            try {
                await getCurrentWindow().setTitle(title);
            } catch (error) {
                console.error('Failed to set window title:', error);
            }
        };
        updateTitle();
    }, [config.name, config.version, projectTitle]);

    return (
        <AppContext.Provider
            value={{
                config, settings, session, state,
                updateSettings, updateSession, addRecentProject, removeRecentProject, updateState,
                setProjectTitle,
                isLoading
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
