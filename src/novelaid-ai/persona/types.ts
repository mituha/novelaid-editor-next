/**
 * ペルソナ（人格）のインターフェース
 */
export interface AiPersona {
    /** 一意識別子 */
    id: string;
    /** 名称 */
    name: string;
    /** 説明 */
    description: string;
    /** アイコン（Lucideアイコン名などを想定） */
    icon?: string;
    /** システムプロンプト */
    systemPrompt: string;
}

/**
 * ペルソナの種別
 */
export type PersonaType = 'builtin' | 'character' | 'custom';

/**
 * メタデータを含むペルソナ情報
 */
export interface PersonaInfo extends AiPersona {
    type: PersonaType;
    /** 関連するファイルパス（キャラクター設定等の場合） */
    filePath?: string;
}
