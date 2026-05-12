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
        // If directory not found, it's just empty
        if (e.message?.includes('not found') || e.toString().includes('NotFound')) {
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

  const generateConlang = useCallback(async (params: GenerationParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const driver = getDriver();
      const generator = new ConlangGenerator(driver);
      
      const newConlang = await generator.generateFull(params, (progress) => {
        setGenerationProgress(progress);
      });

      await saveConlang(newConlang);
      return newConlang;
    } catch (err: any) {
      console.error('Failed to generate conlang:', err);
      setError(err.message || String(err));
      return null;
    } finally {
      setIsLoading(false);
      setGenerationProgress(null);
    }
  }, [getDriver, saveConlang]);

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
