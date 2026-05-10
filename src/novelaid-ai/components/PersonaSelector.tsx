import React, { useState, useRef, useEffect } from 'react';
import { useAiModule } from '../contexts/AiContext';
import * as LucideIcons from 'lucide-react';
import './PersonaSelector.css';

export const PersonaSelector: React.FC = () => {
    const { personas, activePersonaId, setActivePersona, activePersona } = useAiModule();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (iconName?: string) => {
        if (!iconName) return <LucideIcons.User size={16} />;
        const IconComponent = (LucideIcons as any)[iconName];
        return IconComponent ? <IconComponent size={16} /> : <LucideIcons.User size={16} />;
    };

    return (
        <div className="persona-selector" ref={dropdownRef}>
            <div className="persona-selected" onClick={toggleDropdown} title={activePersona.description}>
                <div className="persona-icon-wrapper">
                    {getIcon(activePersona.icon)}
                </div>
                <span className="persona-name">{activePersona.name}</span>
                <LucideIcons.ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="persona-dropdown">
                    {personas.map((persona) => (
                        <div
                            key={persona.id}
                            className={`persona-option ${persona.id === activePersonaId ? 'active' : ''}`}
                            onClick={() => {
                                setActivePersona(persona.id);
                                setIsOpen(false);
                            }}
                        >
                            <div className="persona-option-icon">
                                {getIcon(persona.icon)}
                            </div>
                            <div className="persona-option-info">
                                <div className="persona-option-name">{persona.name}</div>
                                <div className="persona-option-desc">{persona.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
