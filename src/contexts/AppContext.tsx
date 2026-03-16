import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppConfig, AppSettings, AppSession, AppState } from '../types/config';
import { ConfigService } from '../services/configService';

interface AppContextType {
    config: AppConfig;
    settings: AppSettings;
    session: AppSession;
    state: AppState;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    updateSession: (session: Partial<AppSession>) => Promise<void>;
    updateState: (state: Partial<AppState>) => Promise<void>;
    isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig>({ version: '0.1.0' });
    const [settings, setSettings] = useState<AppSettings>({ theme: 'system', language: 'ja' });
    const [session, setSession] = useState<AppSession>({ lastProjectPath: null, lastOpenedFiles: [] });
    const [state, setState] = useState<AppState>({ windowSize: { width: 1200, height: 800 }, sidebarWidth: 260 });
    const [isLoading, setIsLoading] = useState(true);

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const fullConfig = await ConfigService.loadAppConfig();
            setConfig(fullConfig.config);
            setSettings(fullConfig.settings);
            setSession(fullConfig.session);
            setState(fullConfig.state);
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

    const updateState = async (newState: Partial<AppState>) => {
        const updated = { ...state, ...newState };
        setState(updated);
        await ConfigService.saveAppConfig('state', updated);
    };

    return (
        <AppContext.Provider 
            value={{ 
                config, settings, session, state, 
                updateSettings, updateSession, updateState,
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
