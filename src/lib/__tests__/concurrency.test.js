import { describe, it, expect, vi } from 'vitest';
import { runWithConcurrency } from '../concurrency';

describe('runWithConcurrency', () => {
  it('returns empty array when given empty items array', async () => {
    const worker = vi.fn();
    const result = await runWithConcurrency([], 2, worker);
    expect(result).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('preserves order of results even if promises resolve out of order', async () => {
    const items = [50, 10, 30, 5];
    const worker = async (delay) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return `done-${delay}`;
    };

    const result = await runWithConcurrency(items, 2, worker);
    expect(result).toEqual(['done-50', 'done-10', 'done-30', 'done-5']);
  });

  it('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6];

    const worker = async (item) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active--;
      return item * 2;
    };

    const result = await runWithConcurrency(items, 2, worker);
    expect(result).toEqual([2, 4, 6, 8, 10, 12]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('propagates rejection if a task fails', async () => {
    const items = [1, 2, 3];
    const worker = async (item) => {
      if (item === 2) {
        throw new Error('Worker failed');
      }
      return item;
    };

    await expect(runWithConcurrency(items, 2, worker)).rejects.toThrow('Worker failed');
  });
});
