import { AiProvider, ProviderSettings } from 'restar-ai';

export * from 'restar-ai';

/**
 * 全プロバイダーの AI 設定を保持するための型
 */
export type AllAiProviderSettings = Record<AiProvider, ProviderSettings>;

/**
 * AI モジュールの設定データ
 */
export interface AiModuleSettings {
    activeProvider: AiProvider;
    providers: AllAiProviderSettings;
}
