import React from 'react';

export type PaneSide = 'left' | 'right';

export interface PanelDefinition {
    id: string;
    title: string;
    icon: React.ReactNode;
    component: React.ComponentType<any>;
    initialProps?: any;
    defaultSide: PaneSide;
}

export interface PaneState {
    activePanelId: string | null;
    isVisible: boolean;
    width: number;
}
