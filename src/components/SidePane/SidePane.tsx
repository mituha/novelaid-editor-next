import React from 'react';
import { ActivityBar } from './ActivityBar';
import { PaneContent } from './PaneContent';
import { ResizeHandle } from './ResizeHandle';
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
    // Total width = ActivityBar(48px) + Content area
    const totalWidth = isActive ? `${48 + currentPane.width}px` : '48px';

    return (
        <div 
            className={`side-pane ${side} ${!isActive ? 'collapsed' : ''}`} 
            style={{ width: totalWidth, position: 'relative' }}
        >
            <ActivityBar side={side} />
            <PaneContent side={side} />
            {isActive && <ResizeHandle side={side} />}
        </div>
    );
};
