import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearningPathsState } from '../views/learning_paths/useLearningPathsState';

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useCheckLpDependencies: () => ({
    data: { is_ready: true, missing: [] },
    isLoading: false,
  }),
  useLearningPaths: () => ({
    data: {
      items: [
        { id: 1, fullname: 'Ruta 1', visible: 1, subcourse_count: 2 },
        { id: 2, fullname: 'Ruta 2', visible: 0, subcourse_count: 4 },
      ],
      total: 2,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useDeleteLearningPath: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe('useLearningPathsState hook', () => {
  it('initializes state, calculates KPIs and handles delete flow', async () => {
    const { result } = renderHook(() => useLearningPathsState());

    expect(result.current.paths.length).toBe(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.kpis.length).toBe(4);
    expect(result.current.hasCreatePerm).toBe(true);

    // Request delete
    act(() => {
      result.current.handleDeleteRequest(result.current.paths[0]);
    });

    expect(result.current.deleteConfirmOpen).toBe(true);
    expect(result.current.pathToDelete.id).toBe(1);

    // Confirm delete
    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(result.current.deleteConfirmOpen).toBe(false);
  });
});
