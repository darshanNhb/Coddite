/**
 * @implements {import('../../interfaces').TagSuggester}
 */
export class FakeTagSuggester {
  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').TagSuggesterResult>}
   */
  async suggestTags(text) {
    if (text.includes('react')) return { tags: ['react', 'frontend'], provider: 'fake' };
    return { tags: ['general'], provider: 'fake' };
  }
}
