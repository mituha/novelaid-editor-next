import React, { useState } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { useConlangs } from '../hooks/useConlangs';
import { GenerationParams } from '../types';
import './ConlangCreateModal.css';

interface ConlangCreateModalProps {
  onClose: () => void;
}

export const ConlangCreateModal: React.FC<ConlangCreateModalProps> = ({ onClose }) => {
  const { generateConlang, isLoading, generationProgress } = useConlangs();
  const [params, setParams] = useState<GenerationParams>({
    languageName: '',
    keywords: '',
    culturalTheme: '',
    phoneticStyle: 'balanced',
    grammaticalComplexity: 'moderate',
    numInitialWords: 20
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 生成を開始（非同期だが待たない）
    generateConlang(params);
    onClose();
  };

  return (
    <div className="conlang-modal-overlay">
      <div className="conlang-modal">
        <div className="modal-header">
          <h2><Wand2 size={20} /> 架空言語を生成</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
                <label>言語名 (任意)</label>
                <input 
                  type="text" 
                  value={params.languageName} 
                  onChange={e => setParams({...params, languageName: e.target.value})}
                  placeholder="例: エルフ語、古代語など"
                />
              </div>
              <div className="form-group">
                <label>キーワード</label>
                <input 
                  type="text" 
                  value={params.keywords} 
                  onChange={e => setParams({...params, keywords: e.target.value})}
                  placeholder="例: 幻想的、鋭い、風、魔法"
                  required
                />
              </div>
              <div className="form-group">
                <label>文化的テーマ / 背景</label>
                <textarea 
                  value={params.culturalTheme} 
                  onChange={e => setParams({...params, culturalTheme: e.target.value})}
                  placeholder="例: 砂漠を旅する遊牧民の言葉、高度な科学文明の公用語"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>音韻スタイル</label>
                  <select 
                    value={params.phoneticStyle} 
                    onChange={e => setParams({...params, phoneticStyle: e.target.value})}
                  >
                    <option value="melodic">旋律的・柔らかい</option>
                    <option value="harsh">荒々しい・鋭い</option>
                    <option value="balanced">標準的</option>
                    <option value="simple">単純・明快</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>文法複雑度</label>
                  <select 
                    value={params.grammaticalComplexity} 
                    onChange={e => setParams({...params, grammaticalComplexity: e.target.value})}
                  >
                    <option value="simple">単純</option>
                    <option value="moderate">標準</option>
                    <option value="complex">複雑</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={onClose}>キャンセル</button>
                <button type="submit" className="primary-btn">生成を開始</button>
              </div>
        </form>
      </div>
    </div>
  );
};
