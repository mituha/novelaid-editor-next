import { AiDriver } from '../../novelaid-ai/types';
import { Conlang, GenerationParams, Phonology, Morphology, Syntax, WritingSystem, VocabularyEntry, ExampleSentence } from '../types';
import { LinguistPersona, WorldBuilderPersona, COORDINATOR_INSTRUCTION } from './persona';

export interface GenerationProgress {
  step: string;
  message: string;
  percentage: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export class ConlangGenerator {
  private driver: AiDriver;

  constructor(driver: AiDriver) {
    this.driver = driver;
  }

  /**
   * 架空言語を自律的な協調プロセスで生成します。
   */
  async generateFull(params: GenerationParams, onProgress?: ProgressCallback): Promise<Conlang> {
    const langName = params.languageName || `新言語-${Date.now().toString().slice(-4)}`;
    
    // 1. 計画フェーズ (Coordinator)
    onProgress?.({ step: 'planning', message: '生成計画を策定中...', percentage: 10 });
    const purposeConcept = await this.generateConcept(params);

    // 2. 音韻論の設計 (Linguist)
    onProgress?.({ step: 'phonology', message: '音韻体系を構築中...', percentage: 25 });
    const phonology = await this.generatePhonology(params, purposeConcept);

    // 3. 形態論・統語論の設計 (Linguist & WorldBuilder)
    onProgress?.({ step: 'grammar', message: '文法規則を編纂中...', percentage: 45 });
    const morphology = await this.generateMorphology(params, purposeConcept, phonology);
    const syntax = await this.generateSyntax(params, purposeConcept, morphology);

    // 4. 文字体系と背景設定 (WorldBuilder)
    onProgress?.({ step: 'culture', message: '文化と歴史を構築中...', percentage: 65 });
    const writingSystem = await this.generateWritingSystem(params, purposeConcept, phonology);
    const historyBackground = await this.generateHistory(params, purposeConcept, morphology, syntax);

    // 5. 語彙と例文の生成 (Linguist & WorldBuilder)
    onProgress?.({ step: 'vocabulary', message: '初期語彙と例文を作成中...', percentage: 85 });
    const vocabulary = await this.generateVocabulary(params, purposeConcept, phonology, morphology, syntax);
    const exampleSentences = await this.generateExampleSentences(params, vocabulary, morphology, syntax);

    // 6. 最終調整 (Coordinator)
    onProgress?.({ step: 'finalizing', message: '全体の整合性を最終調整中...', percentage: 95 });
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      name: langName,
      purposeConcept,
      phonology,
      morphology,
      syntax,
      vocabulary,
      writingSystem,
      historyBackground,
      exampleSentences,
      createdAt: now,
      updatedAt: now,
      generationParams: params
    };
  }

  private async generateConcept(params: GenerationParams): Promise<string> {
    const prompt = `以下のパラメータに基づき、架空言語「${params.languageName}」の目的とコンセプトを簡潔かつ魅力的に説明してください。
    キーワード: ${params.keywords}
    文化的テーマ: ${params.culturalTheme}
    着想の元: ${params.baseInspiration}`;

    const res = await this.driver.generateText({
      system: COORDINATOR_INSTRUCTION,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.content;
  }

  private async generatePhonology(params: GenerationParams, concept: string): Promise<Phonology> {
    const prompt = `コンセプト「${concept}」に基づき、この言語の音韻論（音素と音節構造）を設計してください。
    JSON形式で出力してください。
    スキーマ: { phonemes: { symbol: string, ipa: string, type: 'consonant'|'vowel'|'diphthong'|'other' }[], syllableStructures: { pattern: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return JSON.parse(res.content);
  }

  private async generateMorphology(params: GenerationParams, concept: string, phonology: Phonology): Promise<Morphology> {
    const prompt = `音韻体系に基づき、形態論（語形成、活用等）を設計してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { typology: string, wordFormationRules: string, affixes: { type: string, form: string, meaning: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return JSON.parse(res.content);
  }

  private async generateSyntax(params: GenerationParams, concept: string, morphology: Morphology): Promise<Syntax> {
    const prompt = `形態論（${morphology.typology}）に基づき、統語論（語順、文構造）を設計してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { wordOrder: string, sentenceStructureRules: string, grammaticalRelations: string }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return JSON.parse(res.content);
  }

  private async generateWritingSystem(params: GenerationParams, concept: string, phonology: Phonology): Promise<WritingSystem> {
    const prompt = `この言語の文化的背景と音韻体系に基づき、文字体系を提案してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { name: string, type: string, description: string, direction: string }`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return JSON.parse(res.content);
  }

  private async generateHistory(params: GenerationParams, concept: string, morphology: Morphology, syntax: Syntax): Promise<string> {
    const prompt = `この言語の文法体系とコンセプトに基づき、歴史的背景を詳述してください。
    コンセプト: ${concept}
    文法: ${morphology.typology}, ${syntax.wordOrder}`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.content;
  }

  private async generateVocabulary(params: GenerationParams, concept: string, phonology: Phonology, morphology: Morphology, syntax: Syntax): Promise<VocabularyEntry[]> {
    const count = params.numInitialWords || 20;
    const prompt = `これまでの設計に基づき、初期語彙を ${count} 語生成してください。
    音韻: ${JSON.stringify(phonology.phonemes.map(p => p.symbol))}
    JSON形式で出力してください。
    スキーマ: { vocabulary: { id: string, word: string, ipa: string, partOfSpeech: string, meaning: string }[] }`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    const data = JSON.parse(res.content);
    return data.vocabulary.map((v: any) => ({ ...v, id: v.id || crypto.randomUUID() }));
  }

  private async generateExampleSentences(params: GenerationParams, vocabulary: VocabularyEntry[], morphology: Morphology, syntax: Syntax): Promise<ExampleSentence[]> {
    const count = params.numExampleSentences || 3;
    const prompt = `語彙と文法規則に基づき、例文を ${count} 件生成してください。
    語彙サンプル: ${vocabulary.slice(0, 5).map(v => `${v.word} (${v.meaning})`).join(', ')}
    JSON形式で出力してください。
    スキーマ: { exampleSentences: { id: string, original: string, translation: string, grammaticalBreakdown: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    const data = JSON.parse(res.content);
    return data.exampleSentences.map((s: any) => ({ ...s, id: s.id || crypto.randomUUID() }));
  }
}
