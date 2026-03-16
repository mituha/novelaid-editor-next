import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { useApp } from './AppContext';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: 'light' | 'dark'; // 現在実際に適用されているテーマ
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { settings, updateSettings } = useApp();
    const theme = settings.theme;

    const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

    const setTheme = (newTheme: Theme) => {
        updateSettings({ theme: newTheme });
    };

    useEffect(() => {
        const applyTheme = () => {
            const root = document.documentElement;
            let effectiveTheme: 'light' | 'dark' = 'dark';

            if (theme === 'system') {
                const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                effectiveTheme = isLight ? 'light' : 'dark';
                root.removeAttribute('data-theme');
            } else {
                effectiveTheme = theme;
                root.setAttribute('data-theme', theme);
            }

            setActualTheme(effectiveTheme);
        };

        applyTheme();

        // システムテーマの変更検知
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
