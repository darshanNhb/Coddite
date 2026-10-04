import { describe, it, expect } from 'vitest';
import { applyModerationPolicy, THRESHOLDS } from '../src/policy/moderationPolicy.js';

describe('Moderation Policy', () => {
  it('ALLOWs content below review threshold', () => {
    const result = applyModerationPolicy({ score: THRESHOLDS.REVIEW - 0.1, provider: 'test' });
    expect(result.decision).toBe('ALLOW');
  });

  it('REVIEWs content at or above review threshold but below hide threshold', () => {
    const result = applyModerationPolicy({ score: THRESHOLDS.REVIEW + 0.05, provider: 'test' });
    expect(result.decision).toBe('REVIEW');
  });

  it('HIDEs content at or above hide threshold', () => {
    const result = applyModerationPolicy({ score: THRESHOLDS.HIDE + 0.01, provider: 'test' });
    expect(result.decision).toBe('HIDE');
  });
});
