import React from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { theme, setTheme } = useTheme();

    if (!isOpen) return null;

    const themeOptions: { id: Theme; label: string; icon: React.ReactNode }[] = [
        { id: 'light', label: 'ライト', icon: <Sun size={20} /> },
        { id: 'dark', label: 'ダーク', icon: <Moon size={20} /> },
        { id: 'system', label: 'システム', icon: <Monitor size={20} /> },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>設定</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body">
                    <section className="setting-section">
                        <h3>表示テーマ</h3>
                        <div className="theme-options">
                            {themeOptions.map((option) => (
                                <button
                                    key={option.id}
                                    className={`theme-btn ${theme === option.id ? 'active' : ''}`}
                                    onClick={() => setTheme(option.id)}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
