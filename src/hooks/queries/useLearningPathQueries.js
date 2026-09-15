import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';
import { createListQuery } from './createListQuery';

// --- Learning Paths ---
export const useLearningPaths = createListQuery('learning-paths', (params) => AdminerApi.getLearningPaths(params));

export function useCheckLpDependencies() {
  return useQuery({
    queryKey: ['lp-dependencies'],
    queryFn: () => AdminerApi.checkLearningPathDependencies(),
    staleTime: 60 * 1000,
  });
}

export function useLearningPathDetail(id) {
  return useQuery({
    queryKey: ['learning-path', id],
    queryFn: () => AdminerApi.getLearningPathDetail(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export const useSearchCoursesForPath = createListQuery('lp-course-search', (params) => AdminerApi.searchCoursesForPath(params));

export function useCreateLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => AdminerApi.createLearningPath(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-paths'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateLpStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }) => AdminerApi.updateLearningPathStructure(id, rest),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['learning-path', id] });
      qc.invalidateQueries({ queryKey: ['learning-paths'] });
    },
  });
}

export function useDeleteLearningPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => AdminerApi.deleteLearningPath(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-paths'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useManageLpEnrolments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }) => AdminerApi.manageLearningPathEnrolments(id, rest),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['learning-path', id] });
      qc.invalidateQueries({ queryKey: ['learning-paths'] });
    },
  });
}
