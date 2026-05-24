import React, { useState, useEffect, useRef } from 'react';
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
import { countCharacters, DetailedCountResult } from 'novelaid-ruby';
import './StatusBar.css';

interface StatusBarProps {
  onGoHome: () => void;
  onOpenSettings: () => void;
}

/**
 * アプリケーションの最下部に表示されるステータスバーコンポーネントです。
 * 基本操作、ファイル情報に加え、リアルタイムな文字数カウントと詳細分析表示を提供します。
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  onGoHome,
  onOpenSettings,
}) => {
  const { activeFilePath, openDocuments } = useDocument();
  const { leftPane, rightPane, togglePaneVisibility } = usePanels();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedCountResult | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<DetailedCountResult | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // アクティブなドキュメントの本文を取得
  const activeDoc = openDocuments.find((d) => d.path === activeFilePath);
  const content = activeDoc?.content || '';

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

  // 全体の文字数カウント (Debounce: 200ms)
  useEffect(() => {
    if (!content || (activeDoc && activeDoc.documentType !== 'novel' && activeDoc.documentType !== 'markdown')) {
      setDetailedMetrics(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const metrics = countCharacters(content);
        setDetailedMetrics(metrics);
      } catch (err) {
        console.error('文字数カウントに失敗しました:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [content, activeDoc?.documentType]);

  // 選択範囲の文字数カウント (Debounce: 100ms)
  useEffect(() => {
    if (!selectedText) {
      setSelectedMetrics(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const metrics = countCharacters(selectedText);
        setSelectedMetrics(metrics);
      } catch (err) {
        console.error('選択範囲の文字数カウントに失敗しました:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedText]);

  // エディタからの選択範囲変更イベントの監視
  useEffect(() => {
    const handleSelectionChange = (e: CustomEvent<{ text: string; path: string }>) => {
      if (e.detail.path === activeFilePath) {
        setSelectedText(e.detail.text);
      }
    };
    window.addEventListener('editor-selection-change' as any, handleSelectionChange);
    return () => {
      window.removeEventListener('editor-selection-change' as any, handleSelectionChange);
    };
  }, [activeFilePath]);

  // アクティブファイルが切り替わったら選択状態をクリア
  useEffect(() => {
    setSelectedText('');
    setSelectedMetrics(null);
    setShowPopup(false);
  }, [activeFilePath]);

  // ポップアップの外側をクリックしたときに閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPopup &&
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

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

      {/* 右側グループ: 文字数表示およびユーティリティ操作 */}
      <div className="status-group right">
        {detailedMetrics && (
          <div
            className="status-btn char-count-trigger"
            ref={triggerRef}
            onClick={() => setShowPopup(!showPopup)}
            title="クリックして文字数詳細を表示"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setShowPopup(!showPopup);
              }
            }}
          >
            {selectedMetrics ? (
              <span className="metric-item highlight">
                選択中: {selectedMetrics.charCount.toLocaleString()} / {detailedMetrics.charCount.toLocaleString()}
              </span>
            ) : (
              <>
                <span className="metric-item">
                  文字数: {detailedMetrics.charCount.toLocaleString()}
                </span>
                <span className="metric-item">
                  行数: {detailedMetrics.lineCount.toLocaleString()}
                </span>
              </>
            )}
          </div>
        )}

        {/* 詳細分析ポップアップ */}
        {showPopup && detailedMetrics && (
          <div className="char-count-popup" ref={popupRef}>
            <div className="popup-header">
              <span className="popup-title">文字数詳細分析</span>
              <button
                type="button"
                className="popup-close-btn"
                onClick={() => setShowPopup(false)}
              >
                &times;
              </button>
            </div>
            <div className="popup-body">
              <div className="popup-section">
                <div className="section-title">基本カウント</div>
                <table className="popup-table">
                  <tbody>
                    <tr>
                      <td className="col-label">基本文字数 (空白・改行除く)</td>
                      <td className="col-value">{detailedMetrics.charCount.toLocaleString()} 字</td>
                    </tr>
                    <tr>
                      <td className="col-label">文字数 (空白・改行含む)</td>
                      <td className="col-value">{detailedMetrics.charCountWithSpaces.toLocaleString()} 字</td>
                    </tr>
                    <tr>
                      <td className="col-label">総文字数 (RAW)</td>
                      <td className="col-value">{detailedMetrics.rawLength.toLocaleString()} 字</td>
                    </tr>
                    <tr>
                      <td className="col-label">総行数</td>
                      <td className="col-value">{detailedMetrics.lineCount.toLocaleString()} 行</td>
                    </tr>
                    <tr>
                      <td className="col-label">原稿用紙換算 (400字詰め)</td>
                      <td className="col-value">{detailedMetrics.manuscriptSheets.toFixed(1)} 枚</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="popup-section">
                <div className="section-title">文体分析 (セリフ / 地の文)</div>
                {(() => {
                  const dialogueCharCount = detailedMetrics.dialogue.charCount || 0;
                  const narrativeCharCount = detailedMetrics.narrative.charCount || 0;
                  const totalStyleChar = dialogueCharCount + narrativeCharCount;
                  const dialogueRatio = totalStyleChar > 0 ? (dialogueCharCount / totalStyleChar) * 100 : 0;
                  const narrativeRatio = totalStyleChar > 0 ? (narrativeCharCount / totalStyleChar) * 100 : 0;

                  return (
                    <div className="ratio-bar-container">
                      <div className="ratio-bar">
                        <div
                          className="ratio-dialogue"
                          style={{ width: `${dialogueRatio}%` }}
                          title={`セリフ: ${dialogueRatio.toFixed(1)}%`}
                        />
                        <div
                          className="ratio-narrative"
                          style={{ width: `${narrativeRatio}%` }}
                          title={`地の文: ${narrativeRatio.toFixed(1)}%`}
                        />
                      </div>
                      <div className="ratio-labels">
                        <span className="label-dialogue">
                          セリフ: {dialogueRatio.toFixed(1)}% ({dialogueCharCount.toLocaleString()}字 / {detailedMetrics.dialogue.lineCount}行)
                        </span>
                        <span className="label-narrative">
                          地の文: {narrativeRatio.toFixed(1)}% ({narrativeCharCount.toLocaleString()}字 / {detailedMetrics.narrative.lineCount}行)
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="popup-section">
                <div className="section-title">空白・改行内訳</div>
                <table className="popup-table">
                  <tbody>
                    <tr>
                      <td className="col-label">全角スペース</td>
                      <td className="col-value">{detailedMetrics.spaces.fullWidth.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="col-label">半角スペース</td>
                      <td className="col-value">{detailedMetrics.spaces.halfWidth.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="col-label">改行コード</td>
                      <td className="col-value">{detailedMetrics.newlines.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
