import React, { useState } from 'react';
import { Languages, Plus, Info, Settings, Trash2, RefreshCw } from 'lucide-react';
import { useConlangs } from '../hooks/useConlangs';
import { Conlang } from '../types';
import { ConlangCreateModal } from './ConlangCreateModal';
import { ConlangDetails } from './ConlangDetails';
import './ConlangPanel.css';

export const ConlangPanel: React.FC = () => {
  const { conlangs, isLoading, error, loadConlangs, generationProgress } = useConlangs();
  const [selectedLang, setSelectedLang] = useState<Conlang | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 生成中のログを保持（簡易チャット形式）
  const [generationLogs, setGenerationLogs] = useState<{ id: string; message: string; type: 'info' | 'success' | 'working' }[]>([]);

  React.useEffect(() => {
    if (generationProgress) {
      setGenerationLogs(prev => {
        // 同じステップのログがあれば更新、なければ追加
        const existing = prev.find(l => l.id === generationProgress.step);
        if (existing) {
          return prev.map(l => l.id === generationProgress.step ? { ...l, message: generationProgress.message } : l);
        }
        return [...prev, { 
          id: generationProgress.step, 
          message: generationProgress.message, 
          type: generationProgress.step === 'done' ? 'success' : 'working' 
        }];
      });
    } else if (!isLoading) {
      // 生成が終わってしばらくしたらログをクリア（または必要に応じて残す）
      // setGenerationLogs([]);
    }
  }, [generationProgress, isLoading]);

  return (
    <div className="novelaid-conlang-panel">
      <div className="conlang-toolbar">
        <button className="create-btn" onClick={() => setIsCreateModalOpen(true)} disabled={isLoading}>
          <Plus size={16} />
          <span>新規言語を作成</span>
        </button>
        <button className="icon-btn" onClick={loadConlangs} title="リフレッシュ">
          <RefreshCw size={16} className={isLoading && !generationProgress ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="conlang-content">
        {isLoading && generationProgress ? (
          <div className="conlang-generation-view">
            <div className="generation-header">
              <RefreshCw size={20} className="animate-spin" />
              <span>言語を構築中...</span>
            </div>
            <div className="generation-chat">
              {generationLogs.map(log => (
                <div key={log.id} className={`chat-bubble ${log.type}`}>
                  <div className="bubble-icon">
                    {log.type === 'working' ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  </div>
                  <div className="bubble-text">{log.message}</div>
                </div>
              ))}
            </div>
            <div className="generation-footer">
              <div className="progress-mini">
                <div className="progress-mini-fill" style={{ width: `${generationProgress.percentage}%` }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="conlang-list">
            {conlangs.length === 0 && !isLoading ? (
              <div className="conlang-empty">
                <Languages size={48} />
                <p>架空言語がまだありません。<br/>AIと一緒に作成しましょう！</p>
              </div>
            ) : (
              conlangs.map(lang => (
                <div 
                  key={lang.id} 
                  className={`conlang-item ${selectedLang?.id === lang.id ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  <div className="conlang-icon">
                    <Languages size={18} />
                  </div>
                  <div className="conlang-info">
                    <div className="conlang-name">{lang.name}</div>
                    <div className="conlang-summary">{lang.purposeConcept}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedLang && (
        <ConlangDetails 
          conlang={selectedLang} 
          onClose={() => setSelectedLang(null)} 
        />
      )}

      {isCreateModalOpen && (
        <ConlangCreateModal 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
};
