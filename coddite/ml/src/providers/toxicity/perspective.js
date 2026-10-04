import { google } from 'googleapis';

/**
 * @implements {import('../../interfaces').ToxicityClassifier}
 */
export class PerspectiveToxicityProvider {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Google API Key is required for Perspective API');
    
    // Perspective API requires googleapis discovery
    this.client = google.discoverAPI(
      'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1'
    ).then(api => {
      // Create a wrapped client with the API key
      return {
        comments: {
          analyze: (params) => api.comments.analyze({ ...params, key: apiKey })
        }
      };
    });
  }

  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').ToxicityResult>}
   */
  async classify(text) {
    const api = await this.client;
    
    try {
      const response = await api.comments.analyze({
        resource: {
          comment: { text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {}
          }
        }
      });
      
      const score = response.data.attributeScores.TOXICITY.summaryScore.value;
      return {
        score,
        provider: 'perspective'
      };
    } catch (err) {
      console.error('[Perspective API Error]:', err.message);
      // Fallback in case of API failure to not block content blindly, but signal error
      return { score: 0.0, provider: 'perspective-error' };
    }
  }
}
