import { mkdir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { 
    FullAppConfiguration, 
    FullProjectConfiguration
} from '../types/config';

const APP_DIR_NAME = 'novelaid-next';
const PROJECT_DIR_NAME = '.novelaid-next';

const DEFAULT_APP_CONFIG: FullAppConfiguration = {
    config: { version: '0.1.0' },
    settings: { theme: 'system', language: 'ja' },
    session: { lastProjectPath: null, lastOpenedFiles: [] },
    state: { windowSize: { width: 1200, height: 800 }, sidebarWidth: 260 }
};

const DEFAULT_PROJECT_CONFIG: FullProjectConfiguration = {
    config: { name: '' },
    settings: {},
    session: { lastFilePath: null, cursorPosition: null },
    state: { expandedFolders: [] }
};

export class ConfigService {
    /**
     * Get the application configuration directory path
     */
    static async getAppConfigPath(): Promise<string> {
        const base = await appConfigDir();
        return await join(base, APP_DIR_NAME);
    }

    /**
     * Get the project configuration directory path
     */
    static async getProjectConfigPath(projectPath: string): Promise<string> {
        return await join(projectPath, PROJECT_DIR_NAME);
    }

    /**
     * Save a configuration file
     */
    private static async saveFile(dirPath: string, fileName: string, data: any): Promise<void> {
        try {
            if (!await exists(dirPath)) {
                await mkdir(dirPath, { recursive: true });
            }
            const filePath = await join(dirPath, fileName);
            await writeTextFile(filePath, JSON.stringify(data, null, 2));
        } catch (e) {
            console.warn(`Failed to save ${fileName} to ${dirPath}:`, e);
            // Don't throw, just log warning
        }
    }

    /**
     * Load a configuration file
     */
    private static async loadFile<T>(dirPath: string, fileName: string, defaultValue: T): Promise<T> {
        try {
            const filePath = await join(dirPath, fileName);
            if (!await exists(filePath)) {
                return defaultValue;
            }
            const content = await readTextFile(filePath);
            return JSON.parse(content) as T;
        } catch (e) {
            // This handles "forbidden path" or missing file edge cases in Tauri 2.0
            console.warn(`Failed to load ${fileName} from ${dirPath}, using default values.`, e);
            return defaultValue;
        }
    }

    // App Level Methods
    static async loadAppConfig(): Promise<FullAppConfiguration> {
        const dir = await this.getAppConfigPath();
        return {
            config: await this.loadFile(dir, 'config.json', DEFAULT_APP_CONFIG.config),
            settings: await this.loadFile(dir, 'settings.json', DEFAULT_APP_CONFIG.settings),
            session: await this.loadFile(dir, 'session.json', DEFAULT_APP_CONFIG.session),
            state: await this.loadFile(dir, 'state.json', DEFAULT_APP_CONFIG.state),
        };
    }

    static async saveAppConfig(type: keyof FullAppConfiguration, data: any): Promise<void> {
        const dir = await this.getAppConfigPath();
        await this.saveFile(dir, `${type}.json`, data);
    }

    // Project Level Methods
    static async loadProjectConfig(projectPath: string): Promise<FullProjectConfiguration> {
        const dir = await this.getProjectConfigPath(projectPath);
        return {
            config: await this.loadFile(dir, 'config.json', DEFAULT_PROJECT_CONFIG.config),
            settings: await this.loadFile(dir, 'settings.json', DEFAULT_PROJECT_CONFIG.settings),
            session: await this.loadFile(dir, 'session.json', DEFAULT_PROJECT_CONFIG.session),
            state: await this.loadFile(dir, 'state.json', DEFAULT_PROJECT_CONFIG.state),
        };
    }

    static async saveProjectConfig(projectPath: string, type: keyof FullProjectConfiguration, data: any): Promise<void> {
        const dir = await this.getProjectConfigPath(projectPath);
        await this.saveFile(dir, `${type}.json`, data);
    }
}
