import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';

// --- Categories ---
export function useCategories(params) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => AdminerApi.getCategories(params),
    staleTime: 30 * 1000,
  });
}

export function useCategoriesFlat() {
  return useQuery({
    queryKey: ['categories_flat'],
    queryFn: () => AdminerApi.getCategoriesFlat(),
    staleTime: 30 * 1000,
  });
}

export function useCategoryDetail(categoryId) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => AdminerApi.getCategoryDetail(categoryId),
    enabled: !!categoryId,
    staleTime: 30 * 1000,
  });
}

export function useCategoryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.categoryAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories_flat'] });
      queryClient.invalidateQueries({ queryKey: ['category'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
