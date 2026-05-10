import { AiPersona } from './types';

/**
 * ペルソナの基底クラス
 */
export class BasePersona implements AiPersona {
    public id: string;
    public name: string;
    public description: string;
    public icon?: string;
    public systemPrompt: string;

    constructor(config: AiPersona) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon;
        this.systemPrompt = config.systemPrompt;
    }

    /**
     * プロンプトを生成します（将来的にコンテキストに応じた動的な生成に対応可能）
     */
    public generatePrompt(): string {
        return this.systemPrompt;
    }
}
