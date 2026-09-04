import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';

// --- Users ---
export function useUsers(params) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => AdminerApi.getUsers(params),
    staleTime: 30 * 1000,
  });
}

export function useUsersKpis(options = {}) {
  return useQuery({
    queryKey: ['users_kpis'],
    queryFn: () => AdminerApi.getUsersKpis(),
    ...options,
  });
}

export function useUserDetail(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => AdminerApi.getUserDetail(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
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
    mutationFn: ({ action, userid, courseids, extraParams, ...rest }) =>
      AdminerApi.userCourseAction(action, userid, courseids, extraParams || rest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
  });
}
