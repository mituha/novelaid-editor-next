import React from 'react';
import { usePanels } from '../../contexts/PanelContext';
import { PaneSide } from '../../types/panel';

interface ActivityBarProps {
    side: PaneSide;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ side }) => {
    const { panels, leftPane, rightPane, setActivePanel } = usePanels();
    
    const currentPane = side === 'left' ? leftPane : rightPane;
    // For now, filter panels by their defaultSide, but in future they might be draggable between sides
    const sidePanels = panels.filter(p => p.defaultSide === side);

    if (sidePanels.length === 0) return null;

    return (
        <div className="activity-bar">
            <div className="activity-bar-main">
                {sidePanels.map(panel => (
                    <div
                        key={panel.id}
                        className={`activity-item ${currentPane.activePanelId === panel.id ? 'active' : ''}`}
                        onClick={() => setActivePanel(side, currentPane.activePanelId === panel.id ? null : panel.id)}
                        title={panel.title}
                    >
                        {panel.icon}
                    </div>
                ))}
            </div>
        </div>
    );
};
