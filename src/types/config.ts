export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
    version: string;
    // Semi-fixed values
}

export interface AppSettings {
    theme: Theme;
    language: string;
    // Add more user settings as needed
}

export interface AppSession {
    lastProjectPath: string | null;
    lastOpenedFiles: string[];
}

export interface AppState {
    windowSize: { width: number; height: number };
    sidebarWidth: number;
}

export interface ProjectConfig {
    name: string;
    // Project-specific semi-fixed values
}

export interface ProjectSettings {
    // Project-specific user settings
}

export interface ProjectSession {
    lastFilePath: string | null;
    cursorPosition: { line: number; ch: number } | null;
}

export interface ProjectState {
    expandedFolders: string[];
}

export interface FullAppConfiguration {
    config: AppConfig;
    settings: AppSettings;
    session: AppSession;
    state: AppState;
}

export interface FullProjectConfiguration {
    config: ProjectConfig;
    settings: ProjectSettings;
    session: ProjectSession;
    state: ProjectState;
}
