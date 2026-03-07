import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen } from 'lucide-react';
import './ProjectLauncher.css';

export const ProjectLauncher: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};
