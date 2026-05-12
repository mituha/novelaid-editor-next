import { useState, useCallback, useEffect } from 'react';
import { readDirectory, readDocument, writeDocument, createDirectory, NovelaidDocument, getProjectDirectory } from 'tauri-plugin-novelaid-fs-api';
import { Conlang, GenerationParams } from '../types';
import { useAiModule } from '../../novelaid-ai/contexts/AiContext';
import { ConlangGenerator, GenerationProgress } from '../ai/generator';

const CONLANG_DIR = 'docs/settings/conlang';

export const useConlangs = () => {
  const [conlangs, setConlangs] = useState<Conlang[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  
  const { getDriver } = useAiModule();

  const getFullDirPath = useCallback(async () => {
    const projectDir = await getProjectDirectory();
    if (!projectDir) return null;
    // Note: Path handling depends on the environment, assuming standard slash here
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
          if (!entry.isDirectory && entry.name.endsWith('.md')) {
            const doc = await readDocument(entry.path);
            if (doc.metadata && doc.metadata.type === 'conlang') {
              // Map document to Conlang type
              loaded.push({
                ...doc.metadata,
                historyBackground: doc.content // History background is often the main content
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

  const saveConlang = useCallback(async (conlang: Conlang) => {
    try {
      const dirPath = await getFullDirPath();
      if (!dirPath) throw new Error('プロジェクトディレクトリが設定されていません');

      // Ensure directory exists
      await createDirectory(dirPath);

      const filePath = `${dirPath}/${conlang.name}.md`;
      const { historyBackground, ...metadata } = conlang;
      
      const doc: NovelaidDocument = {
        path: filePath,
        baseName: `${conlang.name}.md`,
        fileTitle: conlang.name,
        content: historyBackground,
        metadata: { ...metadata, type: 'conlang' },
        documentType: 'markdown' // Or 'conlang' if we added it
      };

      await writeDocument(filePath, doc);
      await loadConlangs(); // Refresh list
    } catch (err: any) {
      console.error('Failed to save conlang:', err);
      throw err;
    }
  }, [getFullDirPath, loadConlangs]);

  /**
   * 架空言語の初期化（生成前保存）
   */
  const initConlang = useCallback(async (params: GenerationParams) => {
    const langName = params.languageName || `新言語-${Date.now().toString().slice(-4)}`;
    const dirPath = await getFullDirPath();
    if (!dirPath) throw new Error('プロジェクトディレクトリが設定されていません');

    await createDirectory(dirPath);
    const filePath = `${dirPath}/${langName}.md`;

    const now = new Date().toISOString();
    const initialConlang: Conlang = {
      id: crypto.randomUUID(),
      name: langName,
      purposeConcept: '生成中...',
      phonology: { phonemes: [], syllableStructures: [] },
      morphology: { typology: '', wordFormationRules: '' },
      syntax: { wordOrder: '', sentenceStructureRules: '', grammaticalRelations: '' },
      vocabulary: [],
      writingSystem: { name: '', type: '', description: '', direction: 'ltr' },
      historyBackground: 'AIエージェントが現在この言語を構築しています...',
      createdAt: now,
      updatedAt: now,
      generationParams: params
    };

    const doc: NovelaidDocument = {
      path: filePath,
      baseName: `${langName}.md`,
      fileTitle: langName,
      content: initialConlang.historyBackground,
      metadata: { ...initialConlang, type: 'conlang', status: 'generating' },
      documentType: 'markdown'
    };

    await writeDocument(filePath, doc);
    await loadConlangs();
    return initialConlang;
  }, [getFullDirPath, loadConlangs]);

  const updateConlang = useCallback(async (conlang: Conlang, status: string = 'generating') => {
    const dirPath = await getFullDirPath();
    if (!dirPath) return;

    const filePath = `${dirPath}/${conlang.name}.md`;
    const { historyBackground, ...metadata } = conlang;

    const doc: NovelaidDocument = {
      path: filePath,
      baseName: `${conlang.name}.md`,
      fileTitle: conlang.name,
      content: historyBackground,
      metadata: { ...metadata, type: 'conlang', status },
      documentType: 'markdown'
    };

    await writeDocument(filePath, doc);
    // 状態をローカルでも更新
    setConlangs(prev => prev.map(c => c.id === conlang.id ? conlang : c));
  }, [getFullDirPath]);

  const generateConlang = useCallback(async (params: GenerationParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const driver = getDriver();
      const generator = new ConlangGenerator(driver);
      
      // 1. 初期ファイル作成
      setGenerationProgress({ step: 'init', message: '初期ファイルを準備中...', percentage: 5 });
      let currentConlang = await initConlang(params);

      // 2. コンセプト
      setGenerationProgress({ step: 'concept', message: 'コンセプトを策定中...', percentage: 15 });
      currentConlang.purposeConcept = await generator.generateConcept(params);
      await updateConlang(currentConlang);

      // 3. 音韻論
      setGenerationProgress({ step: 'phonology', message: '音韻体系を構築中...', percentage: 30 });
      currentConlang.phonology = await generator.generatePhonology(params, currentConlang.purposeConcept);
      await updateConlang(currentConlang);

      // 4. 形態論
      setGenerationProgress({ step: 'morphology', message: '形態論を設計中...', percentage: 45 });
      currentConlang.morphology = await generator.generateMorphology(params, currentConlang.purposeConcept, currentConlang.phonology);
      await updateConlang(currentConlang);

      // 5. 統語論
      setGenerationProgress({ step: 'syntax', message: '統語論を設計中...', percentage: 60 });
      currentConlang.syntax = await generator.generateSyntax(params, currentConlang.purposeConcept, currentConlang.morphology);
      await updateConlang(currentConlang);

      // 6. 文字と背景
      setGenerationProgress({ step: 'culture', message: '文化と歴史を構築中...', percentage: 75 });
      currentConlang.writingSystem = await generator.generateWritingSystem(params, currentConlang.purposeConcept, currentConlang.phonology);
      currentConlang.historyBackground = await generator.generateHistory(params, currentConlang.purposeConcept, currentConlang.morphology, currentConlang.syntax);
      await updateConlang(currentConlang);

      // 7. 語彙と例文
      setGenerationProgress({ step: 'vocabulary', message: '初期語彙と例文を作成中...', percentage: 90 });
      currentConlang.vocabulary = await generator.generateVocabulary(params, currentConlang.purposeConcept, currentConlang.phonology, currentConlang.morphology, currentConlang.syntax);
      currentConlang.exampleSentences = await generator.generateExampleSentences(params, currentConlang.vocabulary, currentConlang.morphology, currentConlang.syntax);
      
      // 8. 完了
      currentConlang.updatedAt = new Date().toISOString();
      await updateConlang(currentConlang, 'complete');
      
      setGenerationProgress({ step: 'done', message: '生成が完了しました！', percentage: 100 });
      return currentConlang;
    } catch (err: any) {
      console.error('Failed to generate conlang:', err);
      setError(err.message || String(err));
      return null;
    } finally {
      setIsLoading(false);
      // しばらく進捗を表示してから消す
      setTimeout(() => setGenerationProgress(null), 3000);
    }
  }, [getDriver, initConlang, updateConlang]);

  const deleteConlang = useCallback(async (conlang: Conlang) => {
    // Note: Standard API might need deleteDocument, but for now we can just ignore
    // Implementing delete might require adding it to the plugin
    console.warn('Delete functionality not yet implemented in standard FS API');
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
