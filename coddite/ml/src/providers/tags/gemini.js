import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @implements {import('../../interfaces').TagSuggester}
 */
export class GeminiTagSuggester {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Google API Key is required for GeminiTagSuggester');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').TagSuggesterResult>}
   */
  async suggestTags(text) {
    const prompt = `
Analyze the following text and suggest up to 5 relevant tags. 
Return ONLY a comma-separated list of tags, all lowercase, alphanumeric only, with no spaces in a single tag.
Text:
"""
${text.substring(0, 5000)}
"""
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textOutput = response.text();
      
      const tags = textOutput
        .split(',')
        .map(t => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length > 0)
        .slice(0, 5);

      return {
        tags,
        provider: 'gemini-1.5-flash'
      };
    } catch (err) {
      console.error('[Gemini Tag Suggester Error]:', err.message);
      return { tags: [], provider: 'gemini-error' };
    }
  }
}
