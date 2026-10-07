import { FakeToxicityProvider, PerspectiveToxicityProvider, FakeEmbeddingProvider, GoogleEmbeddingProvider, FakeTagSuggester, GeminiTagSuggester, applyModerationPolicy } from '@coddite/ml';

const isTest = process.env.NODE_ENV === 'test';

export const toxicity = isTest || !process.env.PERSPECTIVE_API_KEY
  ? new FakeToxicityProvider()
  : new PerspectiveToxicityProvider(process.env.PERSPECTIVE_API_KEY);

const googleKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;

export const embeddings = isTest || !googleKey
  ? new FakeEmbeddingProvider()
  : new GoogleEmbeddingProvider(googleKey);

export const tags = isTest || !googleKey
  ? new FakeTagSuggester()
  : new GeminiTagSuggester(googleKey);

export { applyModerationPolicy };
