import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../services/adminer-api';

// --- Dashboard ---
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => AdminerApi.getDashboard(),
    refetchInterval: 60000, // 1 minute
  });
}

// --- Permissions ---
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => AdminerApi.getPermissions(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// --- Courses ---
export function useCourses(params) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => AdminerApi.getCourses(params),
  });
}

export function useCourseDetail(courseId) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => AdminerApi.getCourseDetail(courseId),
    enabled: !!courseId,
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
  });
}

// --- Categories ---
export function useCategories(params) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => AdminerApi.getCategories(params),
  });
}

export function useCategoriesFlat() {
  return useQuery({
    queryKey: ['categories_flat'],
    queryFn: () => AdminerApi.getCategoriesFlat(),
  });
}

export function useCategoryDetail(categoryId) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => AdminerApi.getCategoryDetail(categoryId),
    enabled: !!categoryId,
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

// --- Users ---
export function useUsers(params) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => AdminerApi.getUsers(params),
  });
}

export function useUsersKpis() {
  return useQuery({
    queryKey: ['users_kpis'],
    queryFn: () => AdminerApi.getUsersKpis(),
  });
}

export function useUserDetail(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => AdminerApi.getUserDetail(userId),
    enabled: !!userId,
  });
}

export function useUserAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => AdminerApi.userAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => AdminerApi.addUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUserCohortAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, userid, cohortids }) => AdminerApi.userCohortAction(action, userid, cohortids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['cohort'] });
    },
  });
}

export function useUserCourseAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, userid, courseids }) => AdminerApi.userCourseAction(action, userid, courseids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
  });
}

// --- Cohorts ---
export function useCohorts(params) {
  return useQuery({
    queryKey: ['cohorts', params],
    queryFn: () => AdminerApi.getCohorts(params),
  });
}

export function useCohortsKpis() {
  return useQuery({
    queryKey: ['cohorts_kpis'],
    queryFn: () => AdminerApi.getCohortsKpis(),
  });
}

export function useCohortDetail(cohortId) {
  return useQuery({
    queryKey: ['cohort', cohortId],
    queryFn: () => AdminerApi.getCohortDetail(cohortId),
    enabled: !!cohortId,
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
