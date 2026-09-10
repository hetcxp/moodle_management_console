import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';
import { createListQuery } from './createListQuery';

// --- Cohorts ---
export const useCohorts = createListQuery('cohorts', (params) => AdminerApi.getCohorts(params));

export function useCohortsKpis(options = {}) {
  return useQuery({
    queryKey: ['cohorts_kpis'],
    queryFn: () => AdminerApi.getCohortsKpis(),
    ...options,
  });
}

export function useCohortDetail(cohortId) {
  return useQuery({
    queryKey: ['cohort', cohortId],
    queryFn: () => AdminerApi.getCohortDetail(cohortId),
    enabled: !!cohortId,
    staleTime: 30 * 1000,
  });
}

export function useCohortAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.cohortAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['cohort'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
