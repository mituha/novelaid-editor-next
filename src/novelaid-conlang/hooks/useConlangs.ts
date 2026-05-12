import { useState, useCallback, useEffect } from 'react';
import { readDirectory, readDocument, writeDocument, createDirectory, NovelaidDocument, getProjectDirectory } from 'tauri-plugin-novelaid-fs-api';
import { Conlang, GenerationParams } from '../types';
import { useAiModule } from '../../novelaid-ai/contexts/AiContext';
import { ConlangGenerator, GenerationProgress } from '../ai/generator';

const CONLANG_DIR = '言語';

export const useConlangs = () => {
  const [conlangs, setConlangs] = useState<Conlang[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  
  const { getDriver } = useAiModule();

  const getFullDirPath = useCallback(async () => {
    const projectDir = await getProjectDirectory();
    if (!projectDir) return null;
    return `${projectDir}/${CONLANG_DIR}`;
  }, []);

  const loadConlangs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dirPath = await getFullDirPath();
      if (!dirPath) throw new Error('プロジェクトディレクトリが設定されていません');

      try {
        const entries = await readDirectory(dirPath);
        const loaded: Conlang[] = [];

        for (const entry of entries) {
          if (entry.isDirectory) {
            // マルチファイル構成: フォルダ内のファイルを読み込んでマージ
            const files = await readDirectory(entry.path);
            let conlangData: Partial<Conlang> = { name: entry.name };
            
            for (const file of files) {
              if (file.name.endsWith('.md')) {
                const doc = await readDocument(file.path);
                const type = doc.metadata?.type;
                
                switch (type) {
                  case 'conlang':
                  case 'conlang-meta':
                    conlangData = { ...conlangData, ...doc.metadata };
                    break;
                  case 'conlang-history':
                    conlangData.historyBackground = doc.content;
                    break;
                  case 'conlang-phonology':
                    conlangData.phonology = doc.metadata.phonology;
                    break;
                  case 'conlang-grammar':
                    conlangData.morphology = doc.metadata.morphology;
                    conlangData.syntax = doc.metadata.syntax;
                    break;
                  case 'conlang-writing':
                    conlangData.writingSystem = doc.metadata.writingSystem;
                    break;
                  case 'conlang-vocabulary':
                    conlangData.vocabulary = doc.metadata.vocabulary;
                    break;
                  case 'conlang-examples':
                    conlangData.exampleSentences = doc.metadata.exampleSentences;
                    break;
                }
              }
            }
            if (conlangData.id) {
              loaded.push(conlangData as Conlang);
            }
          } else if (entry.name.endsWith('.md')) {
            // レガシー構成: 単一ファイル
            const doc = await readDocument(entry.path);
            if (doc.metadata && (doc.metadata.type === 'conlang' || doc.metadata.type === 'conlang-meta')) {
              loaded.push({
                ...doc.metadata,
                historyBackground: doc.content
              } as Conlang);
            }
          }
        }
        setConlangs(loaded);
      } catch (e: any) {
        // ディレクトリが存在しない場合は単に空リストとして扱う
        const errorMsg = e.message || e.toString();
        if (
          errorMsg.includes('not found') || 
          errorMsg.includes('NotFound') || 
          errorMsg.includes('指定されたパスが見つかりません') ||
          errorMsg.includes('os error 3')
        ) {
          setConlangs([]);
        } else {
          throw e;
        }
      }
    } catch (err: any) {
      console.error('Failed to load conlangs:', err);
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [getFullDirPath]);

  const saveConlangFile = useCallback(async (dirPath: string, fileName: string, type: string, conlang: Conlang, content: string = '') => {
    const filePath = `${dirPath}/${fileName}`;
    const doc: NovelaidDocument = {
      path: filePath,
      baseName: fileName,
      fileTitle: conlang.name,
      content,
      metadata: { id: conlang.id, name: conlang.name, type },
      documentType: 'markdown'
    };

    // type に応じてメタデータを付与
    if (type === 'conlang-meta') {
      const { historyBackground, phonology, morphology, syntax, vocabulary, writingSystem, exampleSentences, ...meta } = conlang;
      doc.metadata = { ...doc.metadata, ...meta };
    } else if (type === 'conlang-phonology') {
      doc.metadata.phonology = conlang.phonology;
    } else if (type === 'conlang-grammar') {
      doc.metadata.morphology = conlang.morphology;
      doc.metadata.syntax = conlang.syntax;
    } else if (type === 'conlang-writing') {
      doc.metadata.writingSystem = conlang.writingSystem;
    } else if (type === 'conlang-vocabulary') {
      doc.metadata.vocabulary = conlang.vocabulary;
    } else if (type === 'conlang-examples') {
      doc.metadata.exampleSentences = conlang.exampleSentences;
    }

    await writeDocument(filePath, doc);
  }, []);

  const saveConlang = useCallback(async (conlang: Conlang) => {
    try {
      const baseDirPath = await getFullDirPath();
      if (!baseDirPath) throw new Error('プロジェクトディレクトリが設定されていません');

      const langDirPath = `${baseDirPath}/${conlang.name}`;
      await createDirectory(langDirPath);

      await saveConlangFile(langDirPath, `${conlang.name}.md`, 'conlang-meta', conlang);
      await saveConlangFile(langDirPath, 'history.md', 'conlang-history', conlang, conlang.historyBackground);
      await saveConlangFile(langDirPath, 'phonology.md', 'conlang-phonology', conlang);
      await saveConlangFile(langDirPath, 'grammar.md', 'conlang-grammar', conlang);
      await saveConlangFile(langDirPath, 'writing_system.md', 'conlang-writing', conlang);
      await saveConlangFile(langDirPath, 'examples.md', 'conlang-examples', conlang);
      
      // 語彙ディレクトリ
      const vocabDirPath = `${langDirPath}/vocabulary`;
      await createDirectory(vocabDirPath);
      await saveConlangFile(vocabDirPath, 'index.md', 'conlang-vocabulary', conlang);

      await loadConlangs(); // Refresh list
    } catch (err: any) {
      console.error('Failed to save conlang:', err);
      throw err;
    }
  }, [getFullDirPath, loadConlangs, saveConlangFile]);

  /**
   * 架空言語の初期化（生成前保存）
   */
  const initConlang = useCallback(async (params: GenerationParams) => {
    const langName = params.languageName || `新言語-${Date.now().toString().slice(-4)}`;
    const baseDirPath = await getFullDirPath();
    if (!baseDirPath) throw new Error('プロジェクトディレクトリが設定されていません');

    const langDirPath = `${baseDirPath}/${langName}`;
    await createDirectory(langDirPath);

    const now = new Date().toISOString();
    const initialConlang: Conlang = {
      id: crypto.randomUUID(),
      name: langName,
      purposeConcept: '生成中...',
      phonology: { phonemes: [], syllableStructures: [] },
      morphology: { typology: '', wordFormationRules: '' },
      syntax: { wordOrder: '', sentenceStructureRules: '', grammaticalRelations: '' },
      vocabulary: [],
      writingSystem: { name: '', type: '', description: '', direction: 'ltr', sampleText: '' },
      historyBackground: 'AIエージェントが現在この言語を構築しています...',
      createdAt: now,
      updatedAt: now,
      generationParams: params
    };

    // 初期設定ファイルを保存 ([言語名]/[言語名].md)
    await saveConlangFile(langDirPath, `${langName}.md`, 'conlang-meta', initialConlang);
    await saveConlangFile(langDirPath, 'history.md', 'conlang-history', initialConlang, initialConlang.historyBackground);

    await loadConlangs();
    return initialConlang;
  }, [getFullDirPath, loadConlangs, saveConlangFile]);

  const updateConlang = useCallback(async (conlang: Conlang, status: string = 'generating') => {
    const baseDirPath = await getFullDirPath();
    if (!baseDirPath) return;

    const langDirPath = `${baseDirPath}/${conlang.name}`;
    await createDirectory(langDirPath); 

    // 変更があった可能性のあるファイルを更新
    await saveConlangFile(langDirPath, `${conlang.name}.md`, 'conlang-meta', { ...conlang, metadata: { ...conlang.metadata, status } } as any);
    
    if (conlang.historyBackground) {
      await saveConlangFile(langDirPath, 'history.md', 'conlang-history', conlang, conlang.historyBackground);
    }
    if (conlang.phonology?.phonemes?.length > 0) {
      await saveConlangFile(langDirPath, 'phonology.md', 'conlang-phonology', conlang);
    }
    if (conlang.morphology?.typology || conlang.syntax?.wordOrder) {
      await saveConlangFile(langDirPath, 'grammar.md', 'conlang-grammar', conlang);
    }
    if (conlang.writingSystem?.name) {
      await saveConlangFile(langDirPath, 'writing_system.md', 'conlang-writing', conlang);
    }
    if (conlang.vocabulary?.length > 0) {
      const vocabDirPath = `${langDirPath}/vocabulary`;
      await createDirectory(vocabDirPath);
      await saveConlangFile(vocabDirPath, 'index.md', 'conlang-vocabulary', conlang);
    }
    if (conlang.exampleSentences?.length > 0) {
      await saveConlangFile(langDirPath, 'examples.md', 'conlang-examples', conlang);
    }

    // 状態をローカルでも更新
    setConlangs(prev => prev.map(c => c.id === conlang.id ? conlang : c));
  }, [getFullDirPath, saveConlangFile]);

  const generateConlang = useCallback(async (params: GenerationParams, existingConlang?: Conlang) => {
    setIsLoading(true);
    setError(null);
    try {
      const driver = getDriver();
      const generator = new ConlangGenerator(driver);
      
      let currentConlang: Conlang;

      if (existingConlang) {
        setGenerationProgress({ step: 'resume', message: `「${existingConlang.name}」の構築を再開しています...`, percentage: 5 });
        currentConlang = { ...existingConlang };
      } else {
        // 1. 新規初期フォルダ・ファイル作成
        setGenerationProgress({ step: 'init', message: '初期フォルダとファイルを準備中...', percentage: 5 });
        currentConlang = await initConlang(params);
      }

      // 2. コンセプト
      if (!currentConlang.purposeConcept || currentConlang.purposeConcept === '生成中...') {
        setGenerationProgress({ step: 'concept_start', message: '💡 Coordinator: 言語の方向性を検討中...', percentage: 10 });
        currentConlang.purposeConcept = await generator.generateConcept(params);
        setGenerationProgress({ step: 'concept_done', message: `✅ コンセプトが決定しました: ${currentConlang.purposeConcept.slice(0, 50)}...`, percentage: 15 });
        await updateConlang(currentConlang);
      }

      // 3. 音韻論
      if (!currentConlang.phonology || !currentConlang.phonology.phonemes || currentConlang.phonology.phonemes.length === 0) {
        setGenerationProgress({ step: 'phonology_start', message: '🔊 Linguist: 音韻体系（音素と音節構造）を設計中...', percentage: 25 });
        currentConlang.phonology = await generator.generatePhonology(params, currentConlang.purposeConcept);
        setGenerationProgress({ step: 'phonology_done', message: `✅ 音韻体系が構築されました (${currentConlang.phonology.phonemes?.length || 0}音素)`, percentage: 30 });
        await updateConlang(currentConlang);
      }

      // 4. 形態論
      if (!currentConlang.morphology || !currentConlang.morphology.typology) {
        setGenerationProgress({ step: 'morphology_start', message: '🧩 Linguist: 形態論（語形成規則）を編纂中...', percentage: 40 });
        currentConlang.morphology = await generator.generateMorphology(params, currentConlang.purposeConcept, currentConlang.phonology);
        setGenerationProgress({ step: 'morphology_done', message: '✅ 形態論の設計が完了しました。', percentage: 45 });
        await updateConlang(currentConlang);
      }

      // 5. 統語論
      if (!currentConlang.syntax || !currentConlang.syntax.wordOrder) {
        setGenerationProgress({ step: 'syntax_start', message: '📜 Linguist: 統語論（語順と文構造）を策定中...', percentage: 55 });
        currentConlang.syntax = await generator.generateSyntax(params, currentConlang.purposeConcept, currentConlang.morphology);
        setGenerationProgress({ step: 'syntax_done', message: `✅ 統語論が決定しました (基本語順: ${currentConlang.syntax.wordOrder})`, percentage: 60 });
        await updateConlang(currentConlang);
      }

      // 6. 文字と背景
      if (!currentConlang.writingSystem || !currentConlang.writingSystem.name || (currentConlang.historyBackground && currentConlang.historyBackground.includes('構築しています'))) {
        setGenerationProgress({ step: 'culture_start', message: '🎨 WorldBuilder: 文字体系と歴史的背景を構築中...', percentage: 70 });
        currentConlang.writingSystem = await generator.generateWritingSystem(params, currentConlang.purposeConcept, currentConlang.phonology);
        currentConlang.historyBackground = await generator.generateHistory(params, currentConlang.purposeConcept, currentConlang.morphology, currentConlang.syntax);
        setGenerationProgress({ step: 'culture_done', message: '✅ 文化背景と文字体系が整いました。', percentage: 80 });
        await updateConlang(currentConlang);
      }

      // 7. 語彙と例文
      if (!currentConlang.vocabulary || currentConlang.vocabulary.length === 0) {
        setGenerationProgress({ step: 'vocabulary_start', message: '📖 Linguist & WorldBuilder: 初期語彙と例文を生成中...', percentage: 85 });
        currentConlang.vocabulary = await generator.generateVocabulary(params, currentConlang.purposeConcept, currentConlang.phonology, currentConlang.morphology, currentConlang.syntax);
        currentConlang.exampleSentences = await generator.generateExampleSentences(params, currentConlang.vocabulary, currentConlang.morphology, currentConlang.syntax);
        await updateConlang(currentConlang);
      }
      
      // 8. 完了
      currentConlang.updatedAt = new Date().toISOString();
      await updateConlang(currentConlang, 'complete');
      
      setGenerationProgress({ step: 'done', message: '✨ すべての構築プロセスが完了しました！リストから言語を選択して詳細を確認できます。', percentage: 100 });
      return currentConlang;
    } catch (err: any) {
      console.error('Failed to generate conlang:', err);
      const errorMsg = `❌ 生成中にエラーが発生しました: ${err.message || String(err)}`;
      setError(errorMsg);
      setGenerationProgress({ step: 'error', message: errorMsg, percentage: 0 });
      return null;
    } finally {
      setIsLoading(false);
      // しばらく進捗を表示してから消す
      setTimeout(() => setGenerationProgress(null), 5000);
    }
  }, [getDriver, initConlang, updateConlang]);

  const deleteConlang = useCallback(async (conlang: Conlang) => {
    // ディレクトリごとの削除は別途プラグイン側での対応が必要
    console.warn('Delete functionality not yet implemented for multi-file structure');
  }, []);

  useEffect(() => {
    loadConlangs();
  }, [loadConlangs]);

  return {
    conlangs,
    isLoading,
    error,
    generationProgress,
    loadConlangs,
    generateConlang,
    saveConlang,
    deleteConlang
  };
};

