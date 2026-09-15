import { useState, useEffect, useMemo } from 'react';
import { useBulkSelection } from '../../hooks/useBulkSelection';

export const useCategoriesFilters = (flatCategories = []) => {
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const { selectedIds, setSelectedIds, clearSelection } = useBulkSelection();

  // Filtering & Sorting state
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('-1');
  const [sort, setSort] = useState('name');
  const [dir, setDir] = useState('ASC');

  // Reset page when search, visibilityFilter, sort, or dir change
  useEffect(() => {
    setPage(0);
  }, [search, visibilityFilter, sort, dir]);

  const filteredCategories = useMemo(() => {
    const result = flatCategories.filter((c) => {
      const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
      const matchesVis = visibilityFilter === '-1' || String(c.visible) === visibilityFilter;
      return matchesSearch && matchesVis;
    });

    result.sort((a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return dir === 'ASC' ? -1 : 1;
      if (valA > valB) return dir === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  }, [flatCategories, search, visibilityFilter, sort, dir]);

  const totalCount = filteredCategories.length;
  const paginatedData = useMemo(() => {
    return filteredCategories.slice(page * perPage, (page + 1) * perPage);
  }, [filteredCategories, page, perPage]);

  return {
    page,
    setPage,
    perPage,
    sort,
    setSort,
    dir,
    setDir,
    search,
    setSearch,
    visibilityFilter,
    setVisibilityFilter,
    selectedIds,
    setSelectedIds,
    clearSelection,
    filteredCategories,
    paginatedData,
    totalCount
  };
};
