import React from 'react';
import { usePanels } from '../../contexts/PanelContext';
import { PaneSide } from '../../types/panel';

interface PaneContentProps {
    side: PaneSide;
}

export const PaneContent: React.FC<PaneContentProps> = ({ side }) => {
    const { panels, leftPane, rightPane } = usePanels();
    
    const currentPane = side === 'left' ? leftPane : rightPane;
    const activePanel = panels.find(p => p.id === currentPane.activePanelId);

    if (!activePanel || !currentPane.isVisible) return null;

    const Component = activePanel.component;

    return (
        <div className="pane-content">
            <div className="pane-header">
                <span>{activePanel.title}</span>
            </div>
            <div className="pane-body">
                <Component {...(activePanel.initialProps || {})} />
            </div>
        </div>
    );
};
