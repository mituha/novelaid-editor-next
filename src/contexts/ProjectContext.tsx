import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProjectConfig, ProjectSettings, ProjectSession, ProjectState } from '../types/config';
import { ConfigService } from '../services/configService';
import { setProjectDirectory } from '../../tauri-plugin-novelaid-fs/guest-js';
import { useApp } from './AppContext';

interface ProjectContextType {
    projectPath: string | null;
    config: ProjectConfig;
    settings: ProjectSettings;
    session: ProjectSession;
    state: ProjectState;
    updateSettings: (settings: Partial<ProjectSettings>) => Promise<void>;
    updateSession: (session: Partial<ProjectSession>) => Promise<void>;
    updateState: (state: Partial<ProjectState>) => Promise<void>;
    isLoading: boolean;
    setProjectPath: (path: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projectPath, setProjectPath] = useState<string | null>(null);
    const [config, setConfig] = useState<ProjectConfig>({ name: '' });
    const [settings, setSettings] = useState<ProjectSettings>({});
    const [session, setSession] = useState<ProjectSession>({ lastFilePath: null, cursorPosition: null });
    const [state, setState] = useState<ProjectState>({ expandedFolders: [] });
    const [isLoading, setIsLoading] = useState(false);

    const loadProjectConfig = useCallback(async (path: string) => {
        setIsLoading(true);
        try {
            const fullConfig = await ConfigService.loadProjectConfig(path);
            setConfig(fullConfig.config);
            setSettings(fullConfig.settings);
            setSession(fullConfig.session);
            setState(fullConfig.state);
        } catch (error) {
            console.error('Failed to load project config:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initProject = async () => {
            if (projectPath) {
                await setProjectDirectory(projectPath);
                await loadProjectConfig(projectPath);
            } else {
                await setProjectDirectory(null);
                // Reset to defaults when no project is open
                setConfig({ name: '' });
                setSettings({});
                setSession({ lastFilePath: null, cursorPosition: null });
                setState({ expandedFolders: [] });
            }
        };
        initProject();
    }, [projectPath, loadProjectConfig]);
    
    // Window title update
    const { setProjectTitle } = useApp();
    useEffect(() => {
        const getDisplayTitle = () => {
            if (config.name) return config.name;
            if (projectPath) {
                // Get the last part of the path as folder name
                const parts = projectPath.split(/[\\/]/).filter(Boolean);
                return parts[parts.length - 1] || null;
            }
            return null;
        };
        setProjectTitle(getDisplayTitle());
    }, [config.name, projectPath, setProjectTitle]);

    const updateSettings = async (newSettings: Partial<ProjectSettings>) => {
        if (!projectPath) return;
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        await ConfigService.saveProjectConfig(projectPath, 'settings', updated);
    };

    const updateSession = async (newSession: Partial<ProjectSession>) => {
        if (!projectPath) return;
        const updated = { ...session, ...newSession };
        setSession(updated);
        await ConfigService.saveProjectConfig(projectPath, 'session', updated);
    };

    const updateState = async (newState: Partial<ProjectState>) => {
        if (!projectPath) return;
        const updated = { ...state, ...newState };
        setState(updated);
        await ConfigService.saveProjectConfig(projectPath, 'state', updated);
    };

    return (
        <ProjectContext.Provider 
            value={{ 
                projectPath, config, settings, session, state, 
                updateSettings, updateSession, updateState,
                isLoading, setProjectPath 
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
