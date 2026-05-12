import React, { useState } from 'react';
import { Languages, Plus, Info, Settings, Trash2, RefreshCw } from 'lucide-react';
import { useConlangs } from '../hooks/useConlangs';
import { Conlang } from '../types';
import { ConlangCreateModal } from './ConlangCreateModal';
import { ConlangDetails } from './ConlangDetails';
import './ConlangPanel.css';

export const ConlangPanel: React.FC = () => {
  const { conlangs, isLoading, error, loadConlangs } = useConlangs();
  const [selectedLang, setSelectedLang] = useState<Conlang | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="novelaid-conlang-panel">
      <div className="conlang-toolbar">
        <button className="create-btn" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} />
          <span>新規言語を作成</span>
        </button>
        <button className="icon-btn" onClick={loadConlangs} title="リフレッシュ">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

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
