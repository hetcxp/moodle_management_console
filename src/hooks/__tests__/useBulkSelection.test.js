import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkSelection } from '../useBulkSelection';

describe('useBulkSelection hook', () => {
  it('initializes with default empty selection', () => {
    const { result } = renderHook(() => useBulkSelection());
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('accepts initial values', () => {
    const { result } = renderHook(() => useBulkSelection([10, 20]));
    expect(result.current.selectedIds).toEqual([10, 20]);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionCount).toBe(2);
  });

  it('updates selection and computed counters', () => {
    const { result } = renderHook(() => useBulkSelection());

    act(() => {
      result.current.setSelectedIds([1, 2, 3]);
    });

    expect(result.current.selectedIds).toEqual([1, 2, 3]);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionCount).toBe(3);
  });

  it('clears selection when clearSelection is invoked', () => {
    const { result } = renderHook(() => useBulkSelection([1, 2]));
    expect(result.current.hasSelection).toBe(true);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });
});
