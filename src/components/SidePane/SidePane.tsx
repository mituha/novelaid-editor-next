import React from 'react';
import { ActivityBar } from './ActivityBar';
import { PaneContent } from './PaneContent';
import { PaneSide } from '../../types/panel';
import { usePanels } from '../../contexts/PanelContext';
import './SidePane.css';

interface SidePaneProps {
    side: PaneSide;
}

export const SidePane: React.FC<SidePaneProps> = ({ side }) => {
    const { leftPane, rightPane } = usePanels();
    const currentPane = side === 'left' ? leftPane : rightPane;

    const isActive = !!currentPane.activePanelId && currentPane.isVisible;
    const width = isActive ? `${currentPane.width}px` : '48px';

    return (
        <div 
            className={`side-pane ${side} ${!isActive ? 'collapsed' : ''}`} 
            style={{ width }}
        >
            <ActivityBar side={side} />
            <PaneContent side={side} />
        </div>
    );
};
