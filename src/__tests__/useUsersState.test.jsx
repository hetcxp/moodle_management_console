import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUsersState } from '../views/users/useUsersState';

const mockAddToast = vi.fn();
const mockMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useUsers: () => ({
    data: {
      users: [
        { id: 10, username: 'testuser', fullname: 'Test User', email: 'test@example.com', is_active: 1 },
      ],
      totalcount: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useUsersKpis: () => ({
    data: { total: 1, active: 1, suspended: 0 },
  }),
  useUserAction: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getUsers: vi.fn().mockResolvedValue({ users: [] }),
    getUserDetail: vi.fn().mockResolvedValue({ courses: [] }),
  },
}));

describe('useUsersState hook', () => {
  it('initializes users and handles actions', async () => {
    mockMutateAsync.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUsersState());

    expect(result.current.users.length).toBe(1);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.hasUpdateUsers).toBe(true);
    expect(result.current.hasDeleteUsers).toBe(true);

    // Filter change
    act(() => {
      result.current.setStatusFilter('1');
    });
    expect(result.current.statusFilter).toBe('1');

    // Suspend action
    await act(async () => {
      await result.current.handleBulkSuspend([10]);
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({ action: 'suspend', userids: [10] });
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

    // Activate action
    await act(async () => {
      await result.current.handleBulkActivate([10]);
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({ action: 'activate', userids: [10] });

    // Temp pass modal and execute
    act(() => {
      result.current.handleOpenTempPassConfirm([10]);
    });
    expect(result.current.tempPassConfirmOpen).toBe(true);
    expect(result.current.usersForTempPass).toEqual([10]);

    await act(async () => {
      await result.current.handleExecuteSendTempPassword();
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({ action: 'send_temp_password', userids: [10] });
    expect(result.current.tempPassConfirmOpen).toBe(false);

    // Delete flow
    act(() => {
      result.current.handleOpenDelete([10]);
    });
    expect(result.current.deleteConfirmOpen).toBe(true);

    await act(async () => {
      await result.current.handleExecuteDelete();
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({ action: 'delete', userids: [10] });
    expect(result.current.deleteConfirmOpen).toBe(false);
  });
});
