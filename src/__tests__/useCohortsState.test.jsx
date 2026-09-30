import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCohortsState } from '../views/cohorts/useCohortsState';

const addToastMock = vi.fn();
const performCohortActionMock = vi.fn().mockResolvedValue({});

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
}));

vi.mock('../hooks/usePaginatedExport', () => ({
  usePaginatedExport: () => ({
    exportLoading: false,
    handleExport: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useCohorts: () => ({
    data: {
      cohorts: [
        { id: 1, name: 'Cohorte 2026', idnumber: 'C26', memberscount: 10 },
      ],
      totalcount: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useCohortsKpis: () => ({
    data: { total: 1 },
  }),
  useCohortAction: () => ({
    mutateAsync: performCohortActionMock,
  }),
}));

describe('useCohortsState hook', () => {
  it('initializes cohorts list, handles filters and delete', async () => {
    const { result } = renderHook(() => useCohortsState());

    expect(result.current.cohorts.length).toBe(1);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.hasManageCohorts).toBe(true);

    // Open delete
    act(() => {
      result.current.handleOpenDelete([1]);
    });

    expect(result.current.deleteConfirmOpen).toBe(true);

    // Perform delete
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(performCohortActionMock).toHaveBeenCalledWith({ action: 'delete', cohortid: 1 });
    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
