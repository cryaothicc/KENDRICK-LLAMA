import { describe, expect, it } from 'vitest';
import { formatTime, nextTrackIndex } from '@/lib/player';
describe('Player controls', () => {
  it('formats audio time safely', () => { expect(formatTime(125)).toBe('2:05'); expect(formatTime(NaN)).toBe('0:00'); });
  it('advances and wraps the queue', () => { expect(nextTrackIndex(0, 3, false)).toBe(1); expect(nextTrackIndex(2, 3, false)).toBe(0); });
  it('does not repeat the current track when shuffling', () => { for (let i = 0; i < 30; i++) expect(nextTrackIndex(1, 3, true)).not.toBe(1); });
});