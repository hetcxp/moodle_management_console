import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';

// --- Courses ---
export function useCourses(params) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => AdminerApi.getCourses(params),
    staleTime: 30 * 1000,
  });
}

export function useCourseDetail(courseId) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => AdminerApi.getCourseDetail(courseId),
    enabled: !!courseId,
    staleTime: 30 * 1000,
  });
}

export function useCourseAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.courseAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCourseCohortAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, courseid, cohortids, options }) =>
      AdminerApi.courseCohortAction(action, courseid, cohortids, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['cohort'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
  });
}

export function useCourseUserAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, courseid, userids, timeend, groupid, newgroupname, message_text }) =>
      AdminerApi.courseUserAction(action, courseid, userids, timeend, groupid, newgroupname, message_text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['course_user'] });
    },
  });
}

export function useCourseUserDetail(courseId, userId) {
  return useQuery({
    queryKey: ['course_user', courseId, userId],
    queryFn: () => AdminerApi.getCourseUserDetail(courseId, userId),
    enabled: !!courseId && !!userId,
    staleTime: 30 * 1000,
  });
}
