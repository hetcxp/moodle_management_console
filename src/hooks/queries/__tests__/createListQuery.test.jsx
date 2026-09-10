import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createListQuery } from '../createListQuery';

describe('createListQuery factory', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function TestWrapper({ children }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return TestWrapper;
  };

  it('generates a query hook that fetches data using the provided fetcher', async () => {
    const mockData = { items: [{ id: 1, name: 'Item 1' }], total: 1 };
    const mockFetcher = vi.fn().mockResolvedValue(mockData);

    const useTestItems = createListQuery('test_items', mockFetcher);
    const { result } = renderHook(() => useTestItems({ page: 0, perpage: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetcher).toHaveBeenCalledWith({ page: 0, perpage: 10 });
    expect(result.current.data).toEqual(mockData);
  });
});
