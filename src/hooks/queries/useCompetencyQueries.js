import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';
import { createListQuery } from './createListQuery';

// --- Competencies ---
export function useScales() {
  return useQuery({
    queryKey: ['scales'],
    queryFn: () => AdminerApi.getScales(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompetencyKpis() {
  return useQuery({
    queryKey: ['competency_kpis'],
    queryFn: () => AdminerApi.getCompetencyKpis(),
  });
}

export const useCompetencyFrameworks = createListQuery('competency_frameworks', (params) =>
  AdminerApi.getCompetencyFrameworks(params)
);

export function useCompetencyFrameworkDetail(frameworkId, search = '') {
  return useQuery({
    queryKey: ['competency_framework', frameworkId, search],
    queryFn: () => AdminerApi.getCompetencyFrameworkDetail(frameworkId, search),
    enabled: !!frameworkId,
    staleTime: 30 * 1000,
  });
}

export function useCompetencyFrameworkAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.competencyFrameworkAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency_frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['competency_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['competency_framework'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCompetencyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.competencyAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency_frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['competency_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['competency_framework'] });
      queryClient.invalidateQueries({ queryKey: ['competency_detail'] });
    },
  });
}

export function useCompetencyDetail(competencyId) {
  return useQuery({
    queryKey: ['competency_detail', competencyId],
    queryFn: () => AdminerApi.getCompetencyDetail(competencyId),
    enabled: !!competencyId,
    staleTime: 30 * 1000,
  });
}

export function useCompetencyCourses(competencyId) {
  return useQuery({
    queryKey: ['competency_courses', competencyId],
    queryFn: () => AdminerApi.getCompetencyCourses(competencyId),
    enabled: !!competencyId,
    staleTime: 30 * 1000,
  });
}

export function useCompetencyCourseAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.competencyCourseAction(params),
    onSuccess: (_, variables) => {
      if (variables?.competencyid) {
        queryClient.invalidateQueries({ queryKey: ['competency_courses', variables.competencyid] });
        queryClient.invalidateQueries({ queryKey: ['competency_detail', variables.competencyid] });
      }
      queryClient.invalidateQueries({ queryKey: ['competency_framework'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
  });
}

export function useCourseAvailableActivities(courseId, competencyId = 0) {
  return useQuery({
    queryKey: ['course_available_activities', courseId, competencyId],
    queryFn: () => AdminerApi.getCourseAvailableActivities(courseId, competencyId),
    enabled: !!courseId,
    staleTime: 30 * 1000,
  });
}

export function useModuleCompetencyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.moduleCompetencyAction(params),
    onSuccess: (_, variables) => {
      if (variables?.competencyid) {
        queryClient.invalidateQueries({ queryKey: ['competency_courses', variables.competencyid] });
      }
      queryClient.invalidateQueries({ queryKey: ['course_available_activities'] });
    },
  });
}

export function useCompetencyReviews(params) {
  return useQuery({
    queryKey: ['competency_reviews', params],
    queryFn: () => AdminerApi.getCompetencyReviews(params),
    staleTime: 30 * 1000,
  });
}

export function useCompetencyReviewAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.competencyReviewAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency_reviews'] });
      queryClient.invalidateQueries({ queryKey: ['competency_detail'] });
      queryClient.invalidateQueries({ queryKey: ['competency_framework'] });
      queryClient.invalidateQueries({ queryKey: ['competency_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['competency_users'] });
    },
  });
}

export function useCompetencyUsers(competencyId, params = {}) {
  return useQuery({
    queryKey: ['competency_users', competencyId, params],
    queryFn: () => AdminerApi.getCompetencyUsers(competencyId, params),
    enabled: !!competencyId,
    staleTime: 30 * 1000,
  });
}
