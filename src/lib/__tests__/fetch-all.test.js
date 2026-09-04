import { describe, it, expect, vi } from 'vitest';
import { fetchAllPaginated } from '../fetch-all';

describe('fetchAllPaginated', () => {
  it('fetches all pages for direct array responses', async () => {
    const pages = [
      [1, 2],
      [3, 4],
      [5]
    ];

    const fetchFn = vi.fn().mockImplementation(({ page }) => {
      return Promise.resolve(pages[page] || []);
    });

    const result = await fetchAllPaginated(fetchFn, { perpage: 2 });
    expect(result).toEqual([1, 2, 3, 4, 5]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('stops early when totalcount is reached with object response', async () => {
    const fetchFn = vi.fn().mockImplementation(({ page }) => {
      if (page === 0) {
        return Promise.resolve({ items: [{ id: 1 }, { id: 2 }], totalcount: 3 });
      }
      return Promise.resolve({ items: [{ id: 3 }], totalcount: 3 });
    });

    const result = await fetchAllPaginated(fetchFn, { perpage: 2 });
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('stops when page returns fewer items than perpage', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      courses: [{ id: 10 }, { id: 20 }]
    });

    const result = await fetchAllPaginated(fetchFn, { perpage: 5 });
    expect(result).toEqual([{ id: 10 }, { id: 20 }]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when first call returns empty data', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const result = await fetchAllPaginated(fetchFn);
    expect(result).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('propagates error when fetchFn rejects', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(fetchAllPaginated(fetchFn)).rejects.toThrow('Network error');
  });
});
