/**
 * @implements {import('../../interfaces').EmbeddingProvider}
 */
export class FakeEmbeddingProvider {
  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').EmbeddingResult>}
   */
  async embed(text) {
    // Generate a deterministically fake 768-d vector
    const vector = new Array(768).fill(0).map((_, i) => (text.length + i) % 100 / 100);
    return {
      vector,
      provider: 'fake'
    };
  }
}
