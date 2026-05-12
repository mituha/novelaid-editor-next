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
   * AIからのレスポンス（Markdownコードブロック等を含む可能性がある）からJSONを安全に抽出します。
   */
  private parseResponseJson<T>(content: string): T {
    // ```json ... ``` または ``` ... ``` を除去
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const rawJson = jsonMatch ? jsonMatch[1] : content;
    
    try {
      return JSON.parse(rawJson.trim());
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', rawJson);
      throw new Error(`AIの応答をJSONとして解析できませんでした: ${e}`);
    }
  }

  /**
   * コンセプトの生成
   */
  async generateConcept(params: GenerationParams): Promise<string> {
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

  /**
   * 音韻論の生成
   */
  async generatePhonology(params: GenerationParams, concept: string): Promise<Phonology> {
    const prompt = `コンセプト「${concept}」に基づき、この言語の音韻論（音素と音節構造）を設計してください。
    JSON形式で出力してください。
    スキーマ: { phonemes: { symbol: string, ipa: string, type: 'consonant'|'vowel'|'diphthong'|'other' }[], syllableStructures: { pattern: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return this.parseResponseJson<Phonology>(res.content);
  }

  /**
   * 形態論の生成
   */
  async generateMorphology(params: GenerationParams, concept: string, phonology: Phonology): Promise<Morphology> {
    const prompt = `音韻体系に基づき、形態論（語形成、活用等）を設計してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { typology: string, wordFormationRules: string, affixes: { type: string, form: string, meaning: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return this.parseResponseJson<Morphology>(res.content);
  }

  /**
   * 統語論の生成
   */
  async generateSyntax(params: GenerationParams, concept: string, morphology: Morphology): Promise<Syntax> {
    const prompt = `形態論（${morphology.typology}）に基づき、統語論（語順、文構造）を設計してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { wordOrder: string, sentenceStructureRules: string, grammaticalRelations: string }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return this.parseResponseJson<Syntax>(res.content);
  }

  /**
   * 文字体系の生成
   */
  async generateWritingSystem(params: GenerationParams, concept: string, phonology: Phonology): Promise<WritingSystem> {
    const prompt = `この言語の文化的背景と音韻体系に基づき、文字体系を提案してください。
    コンセプト: ${concept}
    JSON形式で出力してください。
    スキーマ: { name: string, type: string, description: string, direction: string, sampleText: string }`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    return this.parseResponseJson<WritingSystem>(res.content);
  }

  /**
   * 歴史背景の生成
   */
  async generateHistory(params: GenerationParams, concept: string, morphology: Morphology, syntax: Syntax): Promise<string> {
    const prompt = `この言語の文法体系とコンセプトに基づき、歴史的背景を詳述してください。
    コンセプト: ${concept}
    文法: ${morphology.typology}, ${syntax.wordOrder}`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.content;
  }

  /**
   * 語彙の生成
   */
  async generateVocabulary(params: GenerationParams, concept: string, phonology: Phonology, morphology: Morphology, syntax: Syntax): Promise<VocabularyEntry[]> {
    const count = params.numInitialWords || 20;
    const prompt = `これまでの設計に基づき、初期語彙を ${count} 語生成してください。
    音韻: ${JSON.stringify(phonology.phonemes?.map(p => p.symbol))}
    JSON形式で出力してください。
    スキーマ: { vocabulary: { id: string, word: string, ipa: string, partOfSpeech: string, meaning: string }[] }`;

    const res = await this.driver.generateText({
      system: WorldBuilderPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    const data = this.parseResponseJson<{ vocabulary: any[] }>(res.content);
    return data.vocabulary.map((v: any) => ({ ...v, id: v.id || crypto.randomUUID() }));
  }

  /**
   * 例文の生成
   */
  async generateExampleSentences(params: GenerationParams, vocabulary: VocabularyEntry[], morphology: Morphology, syntax: Syntax): Promise<ExampleSentence[]> {
    const count = params.numExampleSentences || 3;
    const prompt = `語彙と文法規則に基づき、例文を ${count} 件生成してください。
    語彙サンプル: ${vocabulary.slice(0, 5).map(v => `${v.word} (${v.meaning})`).join(', ')}
    JSON形式で出力してください。
    スキーマ: { sentences: { id: string, original: string, translation: string, ipa: string, grammaticalBreakdown: string }[] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    const data = this.parseResponseJson<{ sentences: any[] }>(res.content);
    return data.sentences.map((s: any) => ({ ...s, id: s.id || crypto.randomUUID() }));
  }
}
