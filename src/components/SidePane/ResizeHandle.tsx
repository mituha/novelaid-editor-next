import React, { useState, useEffect, useCallback } from 'react';
import { PaneSide } from '../../types/panel';
import { usePanels } from '../../contexts/PanelContext';
import './ResizeHandle.css';

interface ResizeHandleProps {
    side: PaneSide;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ side }) => {
    const { setPaneWidth } = usePanels();
    const [isDragging, setIsDragging] = useState(false);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        if (side === 'left') {
            // Activity Bar is 48px
            const newWidth = e.clientX - 48;
            setPaneWidth('left', newWidth);
        } else {
            const newWidth = window.innerWidth - e.clientX - 48;
            setPaneWidth('right', newWidth);
        }
    }, [isDragging, side, setPaneWidth]);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);

    return (
        <div 
            className={`resize-handle ${side} ${isDragging ? 'dragging' : ''}`}
            onMouseDown={onMouseDown}
        />
    );
};
