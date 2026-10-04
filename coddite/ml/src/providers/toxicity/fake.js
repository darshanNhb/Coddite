/**
 * @implements {import('../../interfaces').ToxicityClassifier}
 */
export class FakeToxicityProvider {
  /**
   * @param {string} text 
   * @returns {Promise<import('../../interfaces').ToxicityResult>}
   */
  async classify(text) {
    // Deterministic fake score
    const isToxic = text.toLowerCase().includes('badword');
    return {
      score: isToxic ? 0.95 : 0.05,
      provider: 'fake'
    };
  }
}
