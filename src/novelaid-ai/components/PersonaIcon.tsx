import React from 'react';
import * as LucideIcons from 'lucide-react';
import { AiPersona } from 'restar-ai';

interface PersonaIconProps {
    /** 表示対象のペルソナ */
    persona?: AiPersona;
    /** アイコンのサイズ */
    size?: number;
}

/**
 * ペルソナのアイコンを表示するコンポーネント
 * Lucideアイコン名から適切なコンポーネントを解決して表示します。
 */
export const PersonaIcon: React.FC<PersonaIconProps> = ({ persona, size = 16 }) => {
    const iconName = persona?.icon;
    
    if (!iconName) {
        return <LucideIcons.User size={size} />;
    }

    // Lucideからアイコンを検索
    const IconComponent = (LucideIcons as any)[iconName];
    
    if (!IconComponent) {
        // 見つからない場合はデフォルトのユーザーアイコン
        return <LucideIcons.User size={size} />;
    }

    return <IconComponent size={size} />;
};
