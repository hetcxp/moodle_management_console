import { useLocation } from 'wouter';
import { useDashboard, useUsersKpis, useCohortsKpis, useUsers, useCourses } from '../../hooks/useAdminerQueries';
import { BookOpen, Users, Layers, FolderTree, CheckCircle, EyeOff, UserCheck, UserX, AlertTriangle } from 'lucide-react';

export const getHealthStatus = (percentage) => {
  if (percentage >= 70) return { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'Óptima' };
  if (percentage >= 40) return { color: 'bg-amber-500', text: 'text-amber-500', label: 'Regular' };
  return { color: 'bg-rose-500', text: 'text-rose-500', label: 'Crítica' };
};

export const useDashboardState = (onNavigate, onNavigateToDetail) => {
  const [, setLocation] = useLocation();
  const handleNavigate = onNavigate || ((t) => setLocation(t === 'dashboard' ? '/' : `/${t}`));
  const handleNavigateToDetail = onNavigateToDetail || ((entity, id) => setLocation(`/${entity}s/${id}`));

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useDashboard();
  const { data: usersKpis, isLoading: usersLoading, refetch: refetchUsers } = useUsersKpis({ enabled: !!stats });
  const { data: cohortsKpis, isLoading: cohortsLoading, refetch: refetchCohorts } = useCohortsKpis({ enabled: !!stats });
  const { data: recentUsersData, isLoading: recentUsersLoading, refetch: refetchRecentUsers } = useUsers({ page: 0, perpage: 5, sort: 'lastaccess', dir: 'DESC' });
  const { data: recentCoursesData, isLoading: recentCoursesLoading, refetch: refetchRecentCourses } = useCourses({ page: 0, perpage: 5, sort: 'timecreated', dir: 'DESC' });

  const recentUsers = recentUsersData?.users || [];
  const recentCourses = recentCoursesData?.courses || [];
  
  const loading = statsLoading || usersLoading || cohortsLoading || recentUsersLoading || recentCoursesLoading;
  const isFetching = statsFetching;

  const handleRefresh = () => {
    refetchStats();
    refetchUsers();
    refetchCohorts();
    refetchRecentUsers();
    refetchRecentCourses();
  };

  const activeRate = usersKpis && usersKpis.total_users > 0 
    ? Math.round((usersKpis.recent_active / usersKpis.total_users) * 100) 
    : 0;
  
  const health = getHealthStatus(activeRate);

  const statCards = [
    {
      title: 'Cursos',
      value: stats?.courses_total ?? 0,
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
      tab: 'courses',
      details: [
        { label: 'Visibles', value: stats?.courses_active ?? 0, icon: CheckCircle, textClass: 'text-emerald-600' },
        { label: 'Ocultos', value: stats?.courses_inactive ?? 0, icon: EyeOff, textClass: 'text-amber-600' },
      ],
      progress: stats?.courses_total > 0 ? (stats.courses_active / stats.courses_total) * 100 : 0
    },
    {
      title: 'Usuarios',
      value: stats?.users_total ?? 0,
      icon: Users,
      color: 'from-violet-500 to-purple-600',
      badgeColor: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
      tab: 'users',
      details: [
        { label: 'Activos', value: stats?.users_active ?? 0, icon: UserCheck, textClass: 'text-emerald-600' },
        { label: 'Suspendidos', value: stats?.users_inactive ?? 0, icon: UserX, textClass: 'text-rose-600' },
      ],
      progress: stats?.users_total > 0 ? (stats.users_active / stats.users_total) * 100 : 0
    },
    {
      title: 'Cohortes',
      value: stats?.cohorts_total ?? 0,
      icon: Layers,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      tab: 'cohorts',
      details: [
        { label: 'Con Miembros', value: cohortsKpis?.active_cohorts ?? 0, icon: CheckCircle, textClass: 'text-emerald-600' },
        { label: 'Vacías', value: cohortsKpis?.empty_cohorts ?? 0, icon: AlertTriangle, textClass: 'text-amber-600' },
      ],
      progress: stats?.cohorts_total > 0 ? ((cohortsKpis?.active_cohorts || 0) / stats.cohorts_total) * 100 : 0
    },
    {
      title: 'Categorías',
      value: stats?.categories_total ?? 0,
      icon: FolderTree,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      tab: 'categories',
      details: [
        { label: 'Visibles', value: stats?.categories_active ?? 0, icon: CheckCircle, textClass: 'text-emerald-600' },
        { label: 'Ocultas', value: stats?.categories_inactive ?? 0, icon: EyeOff, textClass: 'text-amber-600' },
      ],
      progress: stats?.categories_total > 0 ? (stats.categories_active / stats.categories_total) * 100 : 0
    },
  ];

  return {
    handleNavigate,
    handleNavigateToDetail,
    handleRefresh,
    loading,
    isFetching,
    activeRate,
    health,
    statCards,
    stats,
    usersKpis,
    cohortsKpis,
    recentUsers,
    recentCourses,
  };
};
