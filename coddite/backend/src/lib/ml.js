import { FakeToxicityProvider, PerspectiveToxicityProvider, FakeEmbeddingProvider, GoogleEmbeddingProvider, FakeTagSuggester, GeminiTagSuggester, applyModerationPolicy } from '@coddite/ml';

const isTest = process.env.NODE_ENV === 'test';

export const toxicity = isTest || !process.env.PERSPECTIVE_API_KEY
  ? new FakeToxicityProvider()
  : new PerspectiveToxicityProvider(process.env.PERSPECTIVE_API_KEY);

export const embeddings = isTest || !process.env.GOOGLE_AI_KEY
  ? new FakeEmbeddingProvider()
  : new GoogleEmbeddingProvider(process.env.GOOGLE_AI_KEY);

export const tags = isTest || !process.env.GOOGLE_AI_KEY
  ? new FakeTagSuggester()
  : new GeminiTagSuggester(process.env.GOOGLE_AI_KEY);

export { applyModerationPolicy };
