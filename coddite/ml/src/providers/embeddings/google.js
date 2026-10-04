import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @implements {import('../../interfaces').EmbeddingProvider}
 */
export class GoogleEmbeddingProvider {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Google API Key is required for GoogleEmbeddingProvider');
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using text-embedding-004 which returns 768-dimensional embeddings by default
    this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').EmbeddingResult>}
   */
  async embed(text) {
    const result = await this.model.embedContent(text);
    return {
      vector: result.embedding.values,
      provider: 'google-text-embedding-004'
    };
  }
}
