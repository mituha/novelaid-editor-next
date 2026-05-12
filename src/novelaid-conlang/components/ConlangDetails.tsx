import React, { useState } from 'react';
import { X, Save, Book, MessageSquare, List, Info, Type } from 'lucide-react';
import { Conlang } from '../types';
import './ConlangDetails.css';

interface ConlangDetailsProps {
  conlang: Conlang;
  onClose: () => void;
}

type Tab = 'overview' | 'grammar' | 'vocabulary' | 'writing';

export const ConlangDetails: React.FC<ConlangDetailsProps> = ({ conlang, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="conlang-details-overlay">
      <div className="conlang-details">
        <div className="details-header">
          <div className="title-area">
            <h1>{conlang.name}</h1>
            <span className="lang-id">ID: {conlang.id}</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="details-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            <Info size={16} /> 概要
          </button>
          <button className={activeTab === 'grammar' ? 'active' : ''} onClick={() => setActiveTab('grammar')}>
            <List size={16} /> 文法
          </button>
          <button className={activeTab === 'vocabulary' ? 'active' : ''} onClick={() => setActiveTab('vocabulary')}>
            <Book size={16} /> 語彙
          </button>
          <button className={activeTab === 'writing' ? 'active' : ''} onClick={() => setActiveTab('writing')}>
            <Type size={16} /> 文字
          </button>
        </div>

        <div className="details-content">
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <section>
                <h3>コンセプト</h3>
                <p>{conlang.purposeConcept}</p>
              </section>
              <section>
                <h3>歴史的背景</h3>
                <div className="markdown-content">{conlang.historyBackground}</div>
              </section>
            </div>
          )}

          {activeTab === 'grammar' && (
            <div className="tab-pane">
              <section>
                <h3>音韻論 (Phonology)</h3>
                <div className="grid-2">
                  <div>
                    <h4>音素</h4>
                    <ul className="phoneme-list">
                      {conlang.phonology.phonemes?.map((p, i) => (
                        <li key={i}><strong>{p.symbol}</strong> /{p.ipa}/ ({p.type})</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>音節構造</h4>
                    <p>{conlang.phonology.syllableStructures?.map(s => s.pattern).join(', ')}</p>
                  </div>
                </div>
              </section>
              <section>
                <h3>形態論 (Morphology)</h3>
                <p><strong>タイプ:</strong> {conlang.morphology.typology}</p>
                <p>{conlang.morphology.wordFormationRules}</p>
              </section>
              <section>
                <h3>統語論 (Syntax)</h3>
                <p><strong>基本語順:</strong> {conlang.syntax.wordOrder}</p>
                <p>{conlang.syntax.sentenceStructureRules}</p>
              </section>
            </div>
          )}

          {activeTab === 'vocabulary' && (
            <div className="tab-pane">
              <table className="vocab-table">
                <thead>
                  <tr>
                    <th>単語</th>
                    <th>発音 (IPA)</th>
                    <th>品詞</th>
                    <th>意味</th>
                  </tr>
                </thead>
                <tbody>
                  {conlang.vocabulary?.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.word}</strong></td>
                      <td>/{v.ipa}/</td>
                      <td><span className="pos-tag">{v.partOfSpeech}</span></td>
                      <td>{v.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <section className="examples-section">
                <h3>例文</h3>
                {conlang.exampleSentences?.map(s => (
                  <div key={s.id} className="example-item">
                    <div className="original">{s.original}</div>
                    <div className="translation">{s.translation}</div>
                    {s.grammaticalBreakdown && <div className="breakdown">{s.grammaticalBreakdown}</div>}
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeTab === 'writing' && (
            <div className="tab-pane">
              <h3>{conlang.writingSystem.name}</h3>
              <p><strong>タイプ:</strong> {conlang.writingSystem.type}</p>
              <p><strong>書字方向:</strong> {conlang.writingSystem.direction}</p>
              <div className="markdown-content">{conlang.writingSystem.description}</div>
              {conlang.writingSystem.sampleText && (
                <div className="sample-text">
                  <h4>サンプルテキスト</h4>
                  <div className="text">{conlang.writingSystem.sampleText}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
