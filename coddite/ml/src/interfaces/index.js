/**
 * @typedef {Object} ToxicityResult
 * @property {number} score - 0.0 to 1.0 probability of toxicity
 * @property {string} provider - e.g., 'perspective', 'fake', 'heuristic'
 */

/**
 * @typedef {Object} ToxicityClassifier
 * @property {(text: string) => Promise<ToxicityResult>} classify - Analyzes text for toxicity
 */

/**
 * @typedef {Object} EmbeddingResult
 * @property {number[]} vector - The embedding vector (must match schema dimensions, e.g. 768)
 * @property {string} provider - e.g., 'google', 'fake'
 */

/**
 * @typedef {Object} EmbeddingProvider
 * @property {(text: string) => Promise<EmbeddingResult>} embed - Generates vector embedding for text
 */

/**
 * @typedef {Object} TagSuggesterResult
 * @property {string[]} tags - Array of suggested tags
 * @property {string} provider - e.g., 'gemini', 'fake', 'heuristic'
 */

/**
 * @typedef {Object} TagSuggester
 * @property {(text: string) => Promise<TagSuggesterResult>} suggestTags - Generates tag suggestions based on content
 */

export {};
