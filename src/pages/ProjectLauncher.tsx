import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { Settings2, Book } from 'lucide-react';
import { ProjectLauncher as LibProjectLauncher } from 'restar-app';
import { SettingsModal } from '../components/SettingsModal';
import { useApp } from '../contexts/AppContext';

export const ProjectLauncher: React.FC = () => {
  const navigate = useNavigate();
  const { session, addRecentProject, removeRecentProject, config } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenProject = async (path: string) => {
    // パスからプロジェクト名を取得（簡易的）
    const parts = path.split(/[\\/]/).filter(Boolean);
    const name = parts[parts.length - 1] || 'Untitled Project';
    
    await addRecentProject(name, path);
    navigate('/editor', { state: { projectPath: path } });
  };

  const handlePickDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      return selected || undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        zIndex: 100 
      }}>
        <button 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onClick={() => setIsSettingsOpen(true)}
          title="設定"
        >
          <Settings2 size={24} />
        </button>
      </div>

      <LibProjectLauncher
        title={config.name}
        subtitle="作業フォルダー（プロジェクト）を選択してください"
        version={config.version}
        logoIcon={<Book size={48} style={{ color: 'var(--accent-color)' }} />}
        recentProjects={session.recentProjects}
        onOpenProject={handleOpenProject}
        onPickDirectory={handlePickDirectory}
        onRemoveRecent={removeRecentProject}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
