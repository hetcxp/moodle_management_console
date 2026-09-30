import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCoursesState } from '../views/courses/useCoursesState';

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: () => true,
}));

vi.mock('../hooks/useAdminerQueries', () => ({
  useCourses: () => ({
    data: {
      courses: [
        { id: 1, fullname: 'Curso de Prueba', category: 2, visible: 1 },
      ],
      totalcount: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useCategoriesFlat: () => ({
    data: {
      categories: [{ id: 2, name: 'Facultad' }],
    },
  }),
  useCourseAction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('../views/courses/useCoursesExport', () => ({
  useCoursesExport: () => ({
    exportLoading: false,
    handleExportCsv: vi.fn(),
    handleBulkExportCsv: vi.fn(),
  }),
}));

describe('useCoursesState hook', () => {
  it('initializes courses list state and handles permissions and filters', () => {
    const { result } = renderHook(() => useCoursesState());

    expect(result.current.courses.length).toBe(1);
    expect(result.current.courses[0].fullname).toBe('Curso de Prueba');
    expect(result.current.hasCreateCourse).toBe(true);
    expect(result.current.hasDeleteCourse).toBe(true);
    expect(result.current.categoriesList.length).toBe(1);
    expect(result.current.loading).toBe(false);
  });
});
