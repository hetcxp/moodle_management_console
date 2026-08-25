import React, { useState, useEffect } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Users, Layers, FolderTree, ArrowUpRight, CheckCircle, EyeOff, UserCheck, UserX, RotateCw, Activity, AlertTriangle, GraduationCap, Clock } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const DashboardView = ({ onNavigate, onNavigateToDetail }) => {
  const [stats, setStats] = useState(null);
  const [usersKpis, setUsersKpis] = useState(null);
  const [cohortsKpis, setCohortsKpis] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        dashboardData,
        usersKpisData,
        cohortsKpisData,
        recentUsersData,
        recentCoursesData
      ] = await Promise.all([
        AdminerApi.getDashboard(),
        AdminerApi.getUsersKpis(),
        AdminerApi.getCohortsKpis(),
        AdminerApi.getUsers({ page: 0, perpage: 5, sort: 'lastaccess', dir: 'DESC' }),
        AdminerApi.getCourses({ page: 0, perpage: 5, sort: 'timecreated', dir: 'DESC' })
      ]);
      
      setStats(dashboardData);
      setUsersKpis(usersKpisData);
      setCohortsKpis(cohortsKpisData);
      setRecentUsers(recentUsersData.users || []);
      setRecentCourses(recentCoursesData.courses || []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar métricas',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 60 seconds
    const intervalId = setInterval(fetchStats, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const getHealthStatus = (percentage) => {
    if (percentage >= 70) return { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'Óptima' };
    if (percentage >= 40) return { color: 'bg-amber-500', text: 'text-amber-500', label: 'Regular' };
    return { color: 'bg-rose-500', text: 'text-rose-500', label: 'Crítica' };
  };

  // Cálculo de indicadores
  const activeRate = usersKpis && usersKpis.total_users > 0 
    ? Math.round((usersKpis.recent_active / usersKpis.total_users) * 100) 
    : 0;
  
  const health = getHealthStatus(activeRate);

  const statCards = [
    {
      title: 'Cursos',
      total: stats?.courses_total ?? 0,
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
      total: stats?.users_total ?? 0,
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
      total: stats?.cohorts_total ?? 0,
      icon: Layers,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      tab: 'cohorts',
      details: [
        { label: 'Miembros', value: stats?.cohorts_users_total ?? 0, icon: Users, textClass: 'text-slate-600 dark:text-slate-400' },
        { label: 'Vacías', value: cohortsKpis?.empty_cohorts ?? 0, icon: AlertTriangle, textClass: (cohortsKpis?.empty_cohorts > 0) ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400' },
      ],
      progress: cohortsKpis?.total_cohorts > 0 ? ((cohortsKpis.total_cohorts - cohortsKpis.empty_cohorts) / cohortsKpis.total_cohorts) * 100 : 0
    },
    {
      title: 'Categorías',
      total: stats?.categories_total ?? 0,
      icon: FolderTree,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      tab: 'categories',
      details: [
        { label: 'Cursos sincronizados', value: cohortsKpis?.synced_courses ?? 0, icon: Layers, textClass: 'text-slate-600 dark:text-slate-400' },
        { label: 'Actividad Reciente (30d)', value: usersKpis?.recent_active ?? 0, icon: Activity, textClass: 'text-emerald-600' },
      ],
      progress: 100
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Resumen General
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas ejecutivas y monitoreo en tiempo real
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchStats}
          disabled={loading}
          className="gap-2 self-start sm:self-auto bg-card"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Actualizar</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.color}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl ${card.badgeColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-3xl font-extrabold tracking-tight text-foreground">
                  {loading ? '—' : card.total.toLocaleString()}
                </div>

                {/* Mini Sparkline Proportion */}
                {!loading && (
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${card.color}`} style={{ width: `${card.progress}%` }} />
                  </div>
                )}

                <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                  {card.details.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <d.icon className="h-3.5 w-3.5 opacity-70" />
                        {d.label}
                      </span>
                      <span className={`font-semibold ${d.textClass}`}>
                        {loading ? '—' : typeof d.value === 'number' ? d.value.toLocaleString() : d.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onNavigate(card.tab)}
                  className="flex items-center justify-between w-full pt-1 text-xs font-semibold text-primary hover:underline group/link"
                >
                  <span>Ver listado detallado</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Middle Panels: Health & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Salud de la Plataforma */}
        <Card className="flex flex-col border-border/80 shadow-sm">
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
                    <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
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

        {/* Progreso Global */}
        <Card className="flex flex-col border-border/80 shadow-sm">
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
      </div>

      {/* Bottom Panels: Mini-tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Últimos Usuarios Activos */}
        <Card className="border-border/80 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Últimos Usuarios Activos</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate('users')}>Ver todos</Button>
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
                    onClick={() => onNavigateToDetail('user', user.id)}
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

        {/* Cursos Recientes */}
        <Card className="border-border/80 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Cursos Recientes</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onNavigate('courses')}>Ver todos</Button>
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
                    onClick={() => onNavigateToDetail('course', course.id)}
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

      {/* Quick Action Banner */}
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
            <Button onClick={() => onNavigate('courses')} className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Gestionar Cursos</span>
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('users')} className="gap-2">
              <Users className="h-4 w-4" />
              <span>Gestionar Usuarios</span>
            </Button>
            <Button variant="outline" onClick={() => onNavigate('categories')} className="gap-2">
              <FolderTree className="h-4 w-4" />
              <span>Categorías</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
