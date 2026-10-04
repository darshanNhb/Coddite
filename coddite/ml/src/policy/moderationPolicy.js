/**
 * @typedef {'ALLOW' | 'REVIEW' | 'HIDE'} ModerationDecision
 */

/**
 * @typedef {Object} ModerationPolicyResult
 * @property {ModerationDecision} decision
 * @property {number} toxicityScore
 * @property {string} reason
 */

export const THRESHOLDS = {
  HIDE: 0.85,
  REVIEW: 0.65,
};

/**
 * Applies moderation policy based on toxicity score.
 * 
 * @param {import('../interfaces').ToxicityResult} toxicityResult 
 * @returns {ModerationPolicyResult}
 */
export function applyModerationPolicy(toxicityResult) {
  const { score } = toxicityResult;

  if (score >= THRESHOLDS.HIDE) {
    return {
      decision: 'HIDE',
      toxicityScore: score,
      reason: `Toxicity score (${score.toFixed(2)}) exceeded auto-hide threshold (${THRESHOLDS.HIDE})`
    };
  }
  
  if (score >= THRESHOLDS.REVIEW) {
    return {
      decision: 'REVIEW',
      toxicityScore: score,
      reason: `Toxicity score (${score.toFixed(2)}) exceeded manual review threshold (${THRESHOLDS.REVIEW})`
    };
  }

  return {
    decision: 'ALLOW',
    toxicityScore: score,
    reason: `Toxicity score (${score.toFixed(2)}) is acceptable`
  };
}
