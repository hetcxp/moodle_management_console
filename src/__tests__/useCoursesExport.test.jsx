import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoursesExport } from '../views/courses/useCoursesExport';

const mockExecuteExport = vi.fn().mockResolvedValue(true);

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../hooks/usePaginatedExport', () => ({
  usePaginatedExport: () => ({
    exportLoading: false,
    handleExport: mockExecuteExport,
  }),
}));

vi.mock('../services/adminer-api', () => ({
  AdminerApi: {
    getCourses: vi.fn(),
    getCourseDetail: vi.fn().mockResolvedValue({
      users: [
        { id: 1, fullname: 'Student One', email: 's1@example.com', is_active: 1, progress: 50, roles: ['student'] },
      ],
    }),
  },
}));

describe('useCoursesExport hook', () => {
  it('handles export visible courses', async () => {
    const { result } = renderHook(() =>
      useCoursesExport({
        sort: 'fullname',
        dir: 'ASC',
        search: '',
        categoryFilter: '0',
        visibilityFilter: '-1',
      })
    );

    act(() => {
      result.current.setExportModalOpen(true);
      result.current.setExportOption('visible');
    });

    expect(result.current.exportModalOpen).toBe(true);

    await act(async () => {
      result.current.handleExport();
    });

    expect(mockExecuteExport).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'cursos_moodle',
        processData: null,
      })
    );
  });

  it('handles export detailed courses with users', async () => {
    const { result } = renderHook(() =>
      useCoursesExport({
        sort: 'fullname',
        dir: 'ASC',
        search: '',
        categoryFilter: '2',
        visibilityFilter: '1',
      })
    );

    act(() => {
      result.current.setExportOption('detailed');
    });

    await act(async () => {
      result.current.handleExport();
    });

    const callArgs = mockExecuteExport.mock.calls[1][0];
    expect(callArgs.filename).toBe('cursos_usuarios_moodle');
    expect(typeof callArgs.processData).toBe('function');

    const detailedRows = await callArgs.processData([
      { id: 10, fullname: 'Course 10', shortname: 'C10', categoryname: 'Cat', visible: 1, progress_percent: 40 },
    ]);
    expect(detailedRows.length).toBe(1);
    expect(detailedRows[0].user_fullname).toBe('Student One');
  });
});
