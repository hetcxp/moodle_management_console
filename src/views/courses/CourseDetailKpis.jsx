import React, { useMemo } from 'react';
import { Users, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

export const CourseDetailKpis = ({ users = [] }) => {
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => Number(u.status) === 0).length;
    const suspendedUsers = users.filter((u) => Number(u.status) !== 0).length;

    const completedUsers = users.filter((u) => Number(u.progress ?? 0) === 100).length;
    const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

    const totalProgress = users.reduce((acc, u) => acc + Number(u.progress ?? 0), 0);
    const avgProgress = totalUsers > 0 ? Math.round(totalProgress / totalUsers) : 0;

    const inProgressUsers = users.filter((u) => {
      const p = Number(u.progress ?? 0);
      return p > 0 && p < 100;
    }).length;

    const notStartedUsers = users.filter((u) => Number(u.progress ?? 0) === 0).length;
    const notStartedRate = totalUsers > 0 ? Math.round((notStartedUsers / totalUsers) * 100) : 0;

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      completedUsers,
      completionRate,
      avgProgress,
      inProgressUsers,
      notStartedUsers,
      notStartedRate,
    };
  }, [users]);

  return (
    <section aria-label="Indicadores clave del curso" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Matriculados */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Total de usuarios matriculados en este curso con desglose de estado activo/suspendido"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matriculados</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalUsers}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-border/40">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {stats.activeUsers} activos
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {stats.suspendedUsers} suspendidos
          </span>
        </div>
      </div>

      {/* Card 2: Culminados / Progreso */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Usuarios que completaron el 100% de las actividades del curso"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Culminados</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              {stats.completedUsers} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalUsers}</span>
            </h3>
          </div>
        </div>
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Tasa de éxito</span>
            <span className="font-semibold text-foreground">{stats.completionRate}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 3: Avance Promedio */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Promedio ponderado del avance de todos los usuarios matriculados"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avance Promedio</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.avgProgress}%</h3>
          </div>
        </div>
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>{stats.inProgressUsers} en curso</span>
            <span>{stats.notStartedUsers} sin iniciar</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${stats.avgProgress === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
              style={{ width: `${stats.avgProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 4: Sin Iniciar (Riesgo de deserción) */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Alumnos con 0% de avance que requieren seguimiento o inducción"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sin Iniciar</p>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.notStartedUsers}</h3>
          </div>
        </div>
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>En riesgo de rezago</span>
            <span className="font-semibold text-foreground">{stats.notStartedRate}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.notStartedRate}%` }} 
            />
          </div>
        </div>
      </div>
    </section>
  );
};
