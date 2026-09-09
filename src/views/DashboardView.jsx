import React from 'react';
import { useLocation } from 'wouter';
import { useDashboard, useUsersKpis, useCohortsKpis, useUsers, useCourses } from '../hooks/useAdminerQueries';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { KpiGrid } from '../components/KpiGrid';
import { Button } from '../components/ui/Button';
import { BookOpen, Users, Layers, FolderTree, ArrowUpRight, CheckCircle, EyeOff, UserCheck, UserX, RotateCw, Activity, AlertTriangle, GraduationCap, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const DashboardView = ({ onNavigate, onNavigateToDetail }) => {
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

  const getHealthStatus = (percentage) => {
    if (percentage >= 70) return { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'Óptima' };
    if (percentage >= 40) return { color: 'bg-amber-500', text: 'text-amber-500', label: 'Regular' };
    return { color: 'bg-rose-500', text: 'text-rose-500', label: 'Crítica' };
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Resumen General
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span>Métricas ejecutivas y monitoreo en tiempo real</span>
            <span className="block text-xs opacity-80">Métricas al {formatDate(new Date())}</span>
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading || isFetching}
          className="gap-2 self-start sm:self-auto bg-card"
        >
          <RotateCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          <span>Actualizar</span>
        </Button>
      </div>

      <KpiGrid items={statCards} loading={loading} onNavigate={handleNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section aria-label="Salud de la Plataforma">
          <Card className="flex flex-col border-border/80 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-tight">Salud de la Plataforma</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-4 border-muted">
                  {loading ? (
                    <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted" />
                        <circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="213" strokeDashoffset={213 - (213 * activeRate) / 100} className={health.text} />
                      </svg>
                      <span className={`text-xl font-bold ${health.text}`}>{activeRate}%</span>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Tasa de Actividad</h3>
                  <p className="text-sm text-muted-foreground">Usuarios activos en los últimos 30 días</p>
                  {!loading && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${health.color}`} />
                      <span className="text-xs font-semibold uppercase tracking-wider">{health.label}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Cohortes sin usuarios</span>
                  <span className="font-semibold text-foreground">{loading ? '—' : cohortsKpis?.empty_cohorts || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Usuarios suspendidos</span>
                  <span className="font-semibold text-foreground">{loading ? '—' : stats?.users_inactive || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Progreso Global de Cursos">
          <Card className="flex flex-col border-border/80 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-tight">Progreso Global de Cursos</span>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center pt-6">
              {loading ? (
                <RotateCw className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-5xl font-extrabold text-primary mb-2">
                    {usersKpis?.avg_progress ?? 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 text-center max-w-[250px]">
                    Promedio de completitud de los cursos en los que los usuarios están inscritos.
                  </p>
                  <div className="w-full max-w-sm h-3 bg-muted rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-primary" style={{ width: `${usersKpis?.avg_progress ?? 0}%` }} />
                  </div>
                  <div className="w-full max-w-sm flex justify-between text-xs text-muted-foreground font-medium">
                    <span>0%</span>
                    <span>Meta: 100%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border/80 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Últimos Usuarios Activos</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleNavigate('users')}>Ver todos</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="flex justify-center p-8"><RotateCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : recentUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay usuarios recientes</div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleNavigateToDetail('user', user.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {user.firstname.charAt(0)}{user.lastname.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-foreground truncate">{user.fullname}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-4 flex flex-col items-end">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Acceso</span>
                      <span className="font-medium mt-0.5">{user.lastaccess > 0 ? formatDate(user.lastaccess) : 'Nunca'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Cursos Recientes</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleNavigate('courses')}>Ver todos</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="flex justify-center p-8"><RotateCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : recentCourses.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No hay cursos</div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentCourses.map(course => (
                  <div 
                    key={course.id} 
                    className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors gap-4"
                    onClick={() => handleNavigateToDetail('course', course.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-foreground truncate">{course.fullname}</p>
                        <p className="text-xs text-muted-foreground font-mono">{course.shortname}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Inscritos</p>
                        <p className="text-sm font-semibold text-foreground">{course.enrolled_count}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">
              Acciones Administrativas Rápidas
            </h2>
            <p className="text-sm text-muted-foreground">
              Accede directamente a los módulos de gestión masiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button onClick={() => handleNavigate('courses')} className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Gestionar Cursos</span>
            </Button>
            <Button variant="secondary" onClick={() => handleNavigate('users')} className="gap-2">
              <Users className="h-4 w-4" />
              <span>Gestionar Usuarios</span>
            </Button>
            <Button variant="outline" onClick={() => handleNavigate('categories')} className="gap-2">
              <FolderTree className="h-4 w-4" />
              <span>Categorías</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
