import { describe, it, expect, vi } from 'vitest';
import { buildDetailUrl, navigateToDetail } from '../navigation';

describe('Navigation Helpers (buildDetailUrl & navigateToDetail)', () => {
  it('builds detail url correctly for core entities', () => {
    expect(buildDetailUrl('course', 10)).toBe('/courses/10');
    expect(buildDetailUrl('user', 42)).toBe('/users/42');
    expect(buildDetailUrl('cohort', 5)).toBe('/cohorts/5');
    expect(buildDetailUrl('category', 7)).toBe('/categories/7');
    expect(buildDetailUrl('framework', 3)).toBe('/competencies/3');
    expect(buildDetailUrl('competency', 50)).toBe('/competencies/50');
  });

  it('builds detail url correctly for course_user object and fallback', () => {
    expect(buildDetailUrl('course_user', { courseId: 2, userId: 51 })).toBe('/courses/2/users/51');
    expect(buildDetailUrl('course_user', { course_id: 2, user_id: 51 })).toBe('/courses/2/users/51');
    expect(buildDetailUrl('course_user', 51)).toBe('/courses/0/users/51');
  });

  it('navigates via setLocation callback correctly', () => {
    const setLocation = vi.fn();
    navigateToDetail(setLocation, 'course', 101);
    expect(setLocation).toHaveBeenCalledWith('/courses/101');

    navigateToDetail(setLocation, 'course_user', { courseId: 2, userId: 51 });
    expect(setLocation).toHaveBeenCalledWith('/courses/2/users/51');
  });
});
