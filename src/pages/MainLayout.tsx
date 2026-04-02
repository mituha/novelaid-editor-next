import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsModal } from '../components/SettingsModal';
import { Editor } from '../components/Editor';
import { SidePane } from '../components/SidePane/SidePane';
import { useProject } from '../contexts/ProjectContext';
import { DocumentTabs } from '../components/DocumentTabs';
import { useDocument } from '../contexts/DocumentContext';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { setProjectPath } = useProject();
    const { isSplit, activePane, setActivePane } = useDocument();
    
    // Get project path from Router state
    const currentPath = location.state?.projectPath;

    useEffect(() => {
        if (currentPath) {
            setProjectPath(currentPath);
        }
    }, [currentPath, setProjectPath]);

    // Hacks for global UI actions from ActivityBar
    useEffect(() => {
        (window as any).onSettingsClick = () => setIsSettingsOpen(true);
        (window as any).onLauncherClick = () => navigate('/');
        
        return () => {
            delete (window as any).onSettingsClick;
            delete (window as any).onLauncherClick;
        };
    }, [navigate]);

    return (
        <div className="main-layout">
            <SidePane side="left" />
            
            <main className={`editor-area ${isSplit ? 'split' : ''}`}>
                <div 
                    className={`pane-container left ${isSplit && activePane === 'left' ? 'focused' : ''}`}
                    onClick={() => isSplit && setActivePane('left')}
                >
                    <DocumentTabs pane="left" />
                    <div className="editor-content">
                        <Editor pane="left" />
                    </div>
                </div>
                
                {isSplit && (
                    <div 
                        className={`pane-container right ${activePane === 'right' ? 'focused' : ''}`}
                        onClick={() => setActivePane('right')}
                    >
                        <DocumentTabs pane="right" />
                        <div className="editor-content">
                            <Editor pane="right" />
                        </div>
                    </div>
                )}
            </main>
            
            <SidePane side="right" />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
