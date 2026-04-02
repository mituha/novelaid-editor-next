import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDocument } from '../contexts/DocumentContext';
import './SplitResizer.css';

export const SplitResizer: React.FC = () => {
    const { setSplitRatio } = useDocument();
    const [isDragging, setIsDragging] = useState(false);
    const resizerRef = useRef<HTMLDivElement>(null);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        // Find the parent container (editor-area)
        const parent = resizerRef.current?.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newRatio = offsetX / rect.width;
        
        setSplitRatio(newRatio);
    }, [isDragging, setSplitRatio]);

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
            ref={resizerRef}
            className={`split-resizer ${isDragging ? 'dragging' : ''}`}
            onMouseDown={onMouseDown}
        />
    );
};
