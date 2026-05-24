import React, { useState, useEffect } from 'react';
import {
  Home,
  PanelLeft,
  PanelRight,
  Settings,
  Maximize,
  Minimize,
  HelpCircle,
} from 'lucide-react';
import { useDocument } from '../../contexts/DocumentContext';
import { usePanels } from '../../contexts/PanelContext';
import { DocumentIcon } from '../DocumentIcon';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import './StatusBar.css';

interface StatusBarProps {
  onGoHome: () => void;
  onOpenSettings: () => void;
}

/**
 * アプリケーションの最下部に表示されるステータスバーコンポーネントです。
 * 基本的な操作ボタンと、開いているファイル情報を提供します。
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  onGoHome,
  onOpenSettings,
}) => {
  const { activeFilePath, openDocuments } = useDocument();
  const { leftPane, rightPane, togglePaneVisibility } = usePanels();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 初期起動時に現在のフルスクリーン状態を取得し同期する
  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        const fs = await appWindow.isFullscreen();
        setIsFullscreen(fs);
      } catch (err) {
        console.error('フルスクリーン状態の取得に失敗しました:', err);
      }
    };
    checkFullscreen();
  }, []);

  // フルスクリーンの切り替え処理
  const handleToggleFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      const nextFs = !isFullscreen;
      await appWindow.setFullscreen(nextFs);
      setIsFullscreen(nextFs);
    } catch (err) {
      console.error('フルスクリーンの切り替えに失敗しました:', err);
    }
  };

  // オンラインマニュアルを外部ブラウザで開く処理
  const handleOpenManual = async () => {
    try {
      await openUrl('https://mituha.github.io/novelaid-editor/');
    } catch (err) {
      console.error('マニュアルのオープンに失敗しました:', err);
    }
  };

  // 現在アクティブなドキュメント情報の取得
  const activeDoc = openDocuments.find((d) => d.path === activeFilePath);
  const fileName = activeDoc ? activeDoc.baseName : 'ファイルが開かれていません';
  const docType = activeDoc ? activeDoc.documentType : null;

  return (
    <div className="status-bar">
      {/* 左側グループ: アプリケーション操作およびファイル情報 */}
      <div className="status-group left">
        <button
          type="button"
          className="status-btn home-btn"
          onClick={onGoHome}
          title="ホーム画面に戻る"
        >
          <Home size={14} />
        </button>
        <button
          type="button"
          className={`status-btn pane-btn ${!leftPane.isVisible ? 'inactive' : ''}`}
          onClick={() => togglePaneVisibility('left')}
          title="左サイドバーの表示切替"
        >
          <PanelLeft size={14} />
        </button>
        <button
          type="button"
          className="status-btn settings-btn"
          onClick={onOpenSettings}
          title="設定を開く"
        >
          <Settings size={14} />
        </button>

        {activeFilePath && activeDoc && (
          <div className="status-file-info">
            <span className="file-icon-wrapper">
              <DocumentIcon type={docType || 'novel'} isFolder={false} size={14} />
            </span>
            <span className="file-name" title={activeFilePath}>
              {fileName}
            </span>
            {docType && (
              <span className="doc-type-badge">
                {docType.charAt(0).toUpperCase() + docType.slice(1)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 右側グループ: ユーティリティ操作 */}
      <div className="status-group right">
        <button
          type="button"
          className={`status-btn pane-btn ${!rightPane.isVisible ? 'inactive' : ''}`}
          onClick={() => togglePaneVisibility('right')}
          title="右サイドバーの表示切替"
        >
          <PanelRight size={14} />
        </button>
        <button
          type="button"
          className="status-btn fullscreen-btn"
          onClick={handleToggleFullscreen}
          title="フルスクリーン切り替え"
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
        <button
          type="button"
          className="status-btn manual-btn"
          onClick={handleOpenManual}
          title="オンラインマニュアルを開く"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
};
