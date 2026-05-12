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
        // 1. 新規初期ファイル作成
        setGenerationProgress({ step: 'init', message: '初期ファイルを準備中...', percentage: 5 });
        currentConlang = await initConlang(params);
      }

      // 各ステップ、データが未設定の場合のみ生成を実行する（再開対応）
      
      // 2. コンセプト
      if (!currentConlang.purposeConcept || currentConlang.purposeConcept === '生成中...') {
        setGenerationProgress({ step: 'concept_start', message: '💡 Coordinator: 言語の方向性を検討中...', percentage: 10 });
        currentConlang.purposeConcept = await generator.generateConcept(params);
        setGenerationProgress({ step: 'concept_done', message: `✅ コンセプトが決定しました: ${currentConlang.purposeConcept.slice(0, 50)}...`, percentage: 15 });
        await updateConlang(currentConlang);
      }

      // 3. 音韻論
      if (!currentConlang.phonology || currentConlang.phonology.phonemes.length === 0) {
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
      if (!currentConlang.writingSystem || !currentConlang.writingSystem.name || currentConlang.historyBackground.includes('構築しています')) {
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
