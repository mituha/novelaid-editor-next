import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings2, LogOut } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { FileExplorer } from '../components/FileExplorer';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Using React Router state to pass the path for now
    const projectPath = location.state?.projectPath || '未選択';

    return (
        <div className="main-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>プロジェクト</h2>
                    <div className="project-path" title={projectPath}>
                        {projectPath}
                    </div>
                </div>
                
                <div className="sidebar-content">
                    <FileExplorer projectPath={projectPath} />
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
                    <p>ここにエディターコンポーネントが配置されます。</p>
                    <div className="placeholder-info">
                        <p>//TODO: 選択されたフォルダ内のファイルを展開・表示する機能</p>
                    </div>
                </div>
            </main>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
