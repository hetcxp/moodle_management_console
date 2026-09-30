import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearningPathDetailState } from '../views/learning_paths/useLearningPathDetailState';

const mockAddToast = vi.fn();
const mockUpdateStructure = vi.fn();
const mockManageEnrolments = vi.fn();
const mockDeleteLearningPath = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getAutologinUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/autologin' }),
  },
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useLearningPathDetail: () => ({
    data: {
      id: 5,
      fullname: 'Ruta Dev',
      progress_matrix: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: mockRefetch,
  }),
  useUpdateLpStructure: () => ({
    mutateAsync: mockUpdateStructure,
    isPending: false,
  }),
  useManageLpEnrolments: () => ({
    mutateAsync: mockManageEnrolments,
    isPending: false,
  }),
  useDeleteLearningPath: () => ({
    mutateAsync: mockDeleteLearningPath,
    isPending: false,
  }),
}));

describe('useLearningPathDetailState hook', () => {
  it('manages tabs, structure saving, cohorts and user assignments', async () => {
    mockUpdateStructure.mockResolvedValue({});
    mockManageEnrolments.mockResolvedValue({});

    const onNavigateBack = vi.fn();
    const { result } = renderHook(() => useLearningPathDetailState(5, onNavigateBack));

    expect(result.current.path.id).toBe(5);
    expect(result.current.activeTab).toBe('structure');

    // Switch tab
    act(() => {
      result.current.setActiveTab('cohorts');
      result.current.setIsStructureDirty(true);
    });
    expect(result.current.activeTab).toBe('cohorts');
    expect(result.current.isStructureDirty).toBe(true);

    // Save structure
    await act(async () => {
      const res = await result.current.handleSaveStructure({
        subcourse_course_ids: [1, 2],
        enforce_sequence: true,
      });
      expect(res).toBe(true);
    });
    expect(mockUpdateStructure).toHaveBeenCalledWith({
      id: 5,
      subcourse_course_ids: [1, 2],
      enforce_sequence: true,
    });
    expect(result.current.isStructureDirty).toBe(false);

    // Cohorts assignment & removal
    await act(async () => {
      await result.current.handleAssignCohorts([10]);
      await result.current.handleRemoveCohort(10);
    });
    expect(mockManageEnrolments).toHaveBeenCalledWith({ id: 5, action: 'assign', cohortids: [10] });
    expect(mockManageEnrolments).toHaveBeenCalledWith({ id: 5, action: 'remove', cohortids: [10] });

    // Users assignment & removal
    await act(async () => {
      await result.current.handleAssignUsers([99]);
      await result.current.handleRemoveUser(99);
    });
    expect(mockManageEnrolments).toHaveBeenCalledWith({ id: 5, action: 'assign', userids: [99] });
    expect(mockManageEnrolments).toHaveBeenCalledWith({ id: 5, action: 'remove', userids: [99] });

    // Deletion flow
    act(() => {
      result.current.handleDeleteRequest();
    });
    expect(result.current.deleteConfirmOpen).toBe(true);

    mockDeleteLearningPath.mockResolvedValue({ action_taken: 'deleted' });
    await act(async () => {
      await result.current.handleConfirmDelete();
    });
    expect(mockDeleteLearningPath).toHaveBeenCalledWith(5);
    expect(onNavigateBack).toHaveBeenCalled();
  });
});
