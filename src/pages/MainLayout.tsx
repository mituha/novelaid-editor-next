import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings2, LogOut } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { FileExplorer } from '../components/FileExplorer';
import { Editor } from '../components/Editor';
import { MetadataPanel } from '../components/MetadataPanel';
import { useProject } from '../contexts/ProjectContext';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { projectPath, setProjectPath } = useProject();
    
    // Get project path from Router state
    const currentPath = location.state?.projectPath;

    useEffect(() => {
        if (currentPath) {
            setProjectPath(currentPath);
        }
    }, [currentPath, setProjectPath]);

    const displayPath = projectPath || '未選択';

    return (
        <div className="main-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>プロジェクト</h2>
                    <div className="project-path" title={displayPath}>
                        {displayPath}
                    </div>
                </div>
                
                <div className="sidebar-content">
                    <FileExplorer projectPath={displayPath} />
                </div>

                <div className="sidebar-footer">
                    <button className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <Settings2 size={18} />
                        <span>設定</span>
                    </button>
                    <button onClick={() => navigate('/')} className="nav-item return-btn">
                        <LogOut size={18} />
                        <span>ランチャーに戻る</span>
                    </button>
                </div>
            </aside>
            <main className="editor-area">
                <header className="editor-header">
                    <h3>メインエディター</h3>
                </header>
                <div className="editor-content">
                    <Editor />
                </div>
            </main>
            
            <MetadataPanel />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
