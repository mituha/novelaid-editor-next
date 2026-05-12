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
   * AIからのレスポンスからJSONを抽出し、構文エラーを誘発する制御文字等を除去して安全にパースします。
   */
  private parseResponseJson<T>(content: string): T {
    // ```json ... ``` または ``` ... ``` を抽出
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let rawJson = jsonMatch ? jsonMatch[1] : content;
    
    // JSONとして不正な制御文字を除去
    // 特に文字列リテラル内での生のタブが SyntaxError: Bad control character を引き起こす
    rawJson = rawJson.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
      if (match === '\n' || match === '\r') return match; // 改行は後で処理
      if (match === '\t') return '  ';
      return '';
    });

    try {
      return JSON.parse(rawJson.trim());
    } catch (e) {
      console.error('Initial JSON parse failed, attempting cleanup...', e);
      
      // 文字列内の生の改行をエスケープしてみる（よくあるエラーの原因）
      try {
        const cleaned = rawJson.replace(/"([^"]*)"/g, (match, p1) => {
          return `"${p1.replace(/\n/g, '\\n').replace(/\r/g, '')}"`;
        });
        return JSON.parse(cleaned.trim());
      } catch (e2) {
        console.error('Cleanup parse failed:', rawJson);
        throw new Error(`AIの応答をJSONとして解析できませんでした（構文エラー）。出力を簡略化するか、別のモデルをお試しください。: ${e2}`);
      }
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
    【重要】必ず有効な単一のJSONオブジェクトのみを出力してください。文字列内での生の改行やタブは厳禁です。
    スキーマ: { "phonemes": [{ "symbol": "文字", "ipa": "IPA記号", "type": "consonant|vowel|diphthong" }], "syllableStructures": [{ "pattern": "CV等", "description": "簡潔な説明" }] }`;

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
    【重要】JSON文字列内での改行は避け、1行で記述してください。
    スキーマ: { "typology": "分類", "wordFormationRules": "規則の説明", "affixes": [{ "type": "接頭辞等", "form": "形", "meaning": "意味" }] }`;

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
    【重要】JSON形式を厳守し、文字列内に制御文字を含めないでください。
    スキーマ: { "wordOrder": "SVO等", "sentenceStructureRules": "規則", "grammaticalRelations": "格等の説明" }`;

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
    const prompt = `この言語の文化的背景に基づき、文字体系を提案してください。
    コンセプト: ${concept}
    【重要】有効なJSONのみを出力してください。
    スキーマ: { "name": "名称", "type": "体系", "description": "説明", "direction": "ltr/rtl/ttb", "sampleText": "例文" }`;

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
    const prompt = `この言語の文法体系とコンセプトに基づき、歴史向背景を詳述してください。
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
    const count = Math.min(params.numInitialWords || 20, 15); // 生成量を控えめにする
    const prompt = `これまでの設計に基づき、初期語彙を ${count} 語生成してください。
    【重要】JSON文字列内での改行は絶対にしないでください。エスケープされた\\nは使用可能です。
    スキーマ: { "vocabulary": [{ "word": "単語", "ipa": "IPA", "partOfSpeech": "品詞", "meaning": "意味" }] }`;

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
    【重要】JSON形式を厳守してください。
    スキーマ: { "sentences": [{ "original": "原文", "translation": "訳", "ipa": "IPA", "grammaticalBreakdown": "文法解説" }] }`;

    const res = await this.driver.generateText({
      system: LinguistPersona.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      responseMimeType: 'application/json'
    });
    const data = this.parseResponseJson<{ sentences: any[] }>(res.content);
    return data.sentences.map((s: any) => ({ ...s, id: s.id || crypto.randomUUID() }));
  }
}
