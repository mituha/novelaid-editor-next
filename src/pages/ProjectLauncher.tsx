import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Settings2 } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import './ProjectLauncher.css';

export const ProjectLauncher: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        navigate('/editor', { state: { projectPath: selected } });
      }
    } catch (err) {
      console.error(err);
      setError('フォルダの選択に失敗しました。');
    }
  };

  return (
    <div className="project-launcher">
      <div className="launcher-header">
        <button className="settings-toggle" onClick={() => setIsSettingsOpen(true)}>
          <Settings2 size={24} />
        </button>
      </div>

      <div className="launcher-content">
        <h1>novelaid-editor-next</h1>
        <p className="subtitle">作業フォルダー(プロジェクト)を選択してください</p>
        
        <div className="action-buttons">
          <button className="btn-primary" onClick={handleOpenFolder}>
            <FolderOpen size={20} className="icon" />
            既存の書庫を開く
          </button>
        </div>
        
        {error && <p className="error-message">{error}</p>}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
