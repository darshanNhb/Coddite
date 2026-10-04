import { describe, it, expect } from 'vitest';
import { FakeToxicityProvider } from '../src/providers/toxicity/fake.js';
import { FakeEmbeddingProvider } from '../src/providers/embeddings/fake.js';
import { FakeTagSuggester } from '../src/providers/tags/fake.js';

describe('Provider Interfaces Contract Tests', () => {
  it('ToxicityClassifier contract matches', async () => {
    const provider = new FakeToxicityProvider();
    const result = await provider.classify('Some test text');
    
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    
    expect(result).toHaveProperty('provider');
    expect(typeof result.provider).toBe('string');
  });

  it('EmbeddingProvider contract matches', async () => {
    const provider = new FakeEmbeddingProvider();
    const result = await provider.embed('Some text');
    
    expect(result).toHaveProperty('vector');
    expect(Array.isArray(result.vector)).toBe(true);
    expect(result.vector.length).toBe(768);
    expect(typeof result.vector[0]).toBe('number');
    
    expect(result).toHaveProperty('provider');
    expect(typeof result.provider).toBe('string');
  });

  it('TagSuggester contract matches', async () => {
    const provider = new FakeTagSuggester();
    const result = await provider.suggestTags('Some text about react');
    
    expect(result).toHaveProperty('tags');
    expect(Array.isArray(result.tags)).toBe(true);
    if (result.tags.length > 0) {
      expect(typeof result.tags[0]).toBe('string');
    }
    
    expect(result).toHaveProperty('provider');
    expect(typeof result.provider).toBe('string');
  });
});
