import React, { useEffect, useRef, useState } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ left: x, top: y });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleScrollOrResize = () => {
            onClose();
        };

        // トリガーイベントのバブリングによる即時クローズを防ぐため、僅かに遅延させてイベントを登録します
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('contextmenu', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [onClose]);

    // メニュー表示後に画面外にはみ出ないように配置を調整します
    useEffect(() => {
        if (menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            let newX = x;
            let newY = y;

            if (x + menuRect.width > window.innerWidth) {
                newX = window.innerWidth - menuRect.width - 8;
            }
            if (y + menuRect.height > window.innerHeight) {
                newY = window.innerHeight - menuRect.height - 8;
            }

            setCoords({ left: newX, top: newY });
        }
    }, [x, y, items]);

    return (
        <div 
            ref={menuRef} 
            className="custom-context-menu" 
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className="context-menu-item"
                    onClick={(e) => {
                        e.stopPropagation();
                        item.onClick();
                        onClose();
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
};
