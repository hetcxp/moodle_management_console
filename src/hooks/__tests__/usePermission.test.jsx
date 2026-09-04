import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission, usePermissionsHelper } from '../usePermission';
import * as AuthContextModule from '../../context/AuthContext';

describe('usePermission and usePermissionsHelper hooks', () => {
  it('returns false when permissions are null or undefined', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ permissions: null });

    const { result } = renderHook(() => usePermission('can_manage_categories'));
    expect(result.current).toBe(false);

    const helper = renderHook(() => usePermissionsHelper()).result;
    expect(helper.current.has('can_manage_categories')).toBe(false);
  });

  it('returns true for any capability if user is_siteadmin === 1', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      permissions: { is_siteadmin: 1, can_manage_categories: 0 }
    });

    const { result } = renderHook(() => usePermission('can_manage_categories'));
    expect(result.current).toBe(true);

    const helper = renderHook(() => usePermissionsHelper()).result;
    expect(helper.current.has('some_random_capability')).toBe(true);
  });

  it('returns true when user has the specific capability but is not siteadmin', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      permissions: { is_siteadmin: 0, can_manage_categories: 1, can_create_courses: 0 }
    });

    const { result: hasCat } = renderHook(() => usePermission('can_manage_categories'));
    expect(hasCat.current).toBe(true);

    const { result: hasCreate } = renderHook(() => usePermission('can_create_courses'));
    expect(hasCreate.current).toBe(false);

    const helper = renderHook(() => usePermissionsHelper()).result;
    expect(helper.current.has('can_manage_categories')).toBe(true);
    expect(helper.current.has('can_create_courses')).toBe(false);
  });
});
