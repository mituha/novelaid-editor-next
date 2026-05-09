import { AiProvider, ProviderSettings } from 'restar-ai';

export * from 'restar-ai';

/**
 * 全プロバイダーの AI 設定を保持するための型
 */
export type AllAiProviderSettings = Record<AiProvider, ProviderSettings>;

/**
 * AI コンテキストの設定
 */
export interface AiContextSettings {
    includeActiveLeft: boolean;
    includeActiveRight: boolean;
    includeAllOpen: boolean;
    customPaths: string[];
}

/**
 * AI モジュールの設定データ
 */
export interface AiModuleSettings {
    activeProvider: AiProvider;
    providers: AllAiProviderSettings;
    context: AiContextSettings;
}
