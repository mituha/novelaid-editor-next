
export interface Phoneme {
  symbol: string;
  ipa: string;
  type: 'consonant' | 'vowel' | 'diphthong' | 'other';
  description?: string;
}

export interface SyllableStructure {
  pattern: string;
  description?: string;
}

export interface Phonology {
  phonemes: Phoneme[];
  syllableStructures: SyllableStructure[];
  intonationPatterns?: string;
  stressRules?: string;
  phonotactics?: string;
}

export interface Morphology {
  typology: string;
  wordFormationRules: string;
  nounInflection?: {
    cases?: string;
    numbers?: string;
    gender?: string;
  };
  verbConjugation?: {
    tenses?: string;
    aspects?: string;
    moods?: string;
    agreement?: string;
  };
  affixes?: { type: 'prefix' | 'suffix' | 'infix' | 'circumfix'; form: string; meaning: string }[];
  otherFeatures?: string;
}

export interface Syntax {
  wordOrder: string;
  sentenceStructureRules: string;
  grammaticalRelations: string;
  clauseTypes?: string;
  modifiers?: string;
}

export interface VocabularyEntry {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaning: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  etymology?: string;
}

export interface WritingSystem {
  name: string;
  type: string;
  description: string;
  direction: 'ltr' | 'rtl' | 'ttb' | 'btt' | string;
  characters?: { char: string; ipa?: string; name?: string; description?: string }[];
  sampleText?: string;
  notes?: string;
}

export interface ExampleSentence {
  id: string;
  original: string;
  translation: string;
  grammaticalBreakdown?: string;
}

export interface Conlang {
  id: string;
  name: string;
  purposeConcept: string;
  phonology: Phonology;
  morphology: Morphology;
  syntax: Syntax;
  vocabulary: VocabularyEntry[];
  writingSystem: WritingSystem;
  historyBackground: string;
  exampleSentences: ExampleSentence[];
  createdAt: string;
  updatedAt: string;
  generationParams?: GenerationParams;
}

export interface GenerationParams {
  languageName?: string;
  keywords?: string;
  purpose?: string;
  phoneticStyle?: string;
  grammaticalComplexity?: string;
  culturalTheme?: string;
  baseInspiration?: string;
  numInitialWords?: number;
  numExampleSentences?: number;
}
