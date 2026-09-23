import React, { useMemo } from 'react';
import { Users, CheckCircle2, TrendingUp, Milestone } from 'lucide-react';

/**
 * Tarjetas de indicadores clave (KPIs) para la vista de detalle de rutas formativas.
 * Alineado con el diseño estético de CourseDetailKpis.
 *
 * @param {Object} props
 * @param {Object} props.path
 */
export const LearningPathDetailKpis = ({ path }) => {
  const stats = useMemo(() => {
    const rawUsers = path?.users || [];
    // Fallback con progress_matrix si users aún no está poblado
    const users = rawUsers.length > 0 
      ? rawUsers 
      : (path?.progress_matrix || []).map((p) => ({
          status: 0,
          progress: p.progress_pct ?? 0,
        }));

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

    const sections = path?.sections || [];
    const subcourseCount = sections.filter((s) => s.subcourse_course_id).length;
    const isSequential = !!path?.enforce_sequence;

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      completedUsers,
      completionRate,
      avgProgress,
      inProgressUsers,
      subcourseCount,
      isSequential,
    };
  }, [path]);

  return (
    <section aria-label="Indicadores clave de la ruta de aprendizaje" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Matriculados */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Total de estudiantes matriculados en esta ruta de aprendizaje"
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

      {/* Card 2: Culminados / Tasa de éxito */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Estudiantes que culminaron el 100% de los módulos de la ruta"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Culminados</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground">{stats.completedUsers}</h3>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({stats.completionRate}%)
              </span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-border/40">
          <div className="w-full bg-muted/70 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.completionRate}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 3: Avance Promedio */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Promedio de progreso de todos los estudiantes en los módulos enlazados"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avance Promedio</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground">{stats.avgProgress}%</h3>
              <span className="text-xs text-muted-foreground">
                ({stats.inProgressUsers} en curso)
              </span>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-border/40">
          <div className="w-full bg-muted/70 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.avgProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 4: Estructura Formativa */}
      <div 
        className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-border/80"
        title="Configuración de módulos y reglas de prelación de la ruta"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Milestone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estructura</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground">{stats.subcourseCount}</h3>
              <span className="text-xs text-muted-foreground">
                {stats.subcourseCount === 1 ? 'módulo' : 'módulos'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/40">
          <span className={`inline-flex items-center gap-1.5 font-medium ${
            stats.isSequential 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-blue-600 dark:text-blue-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${stats.isSequential ? 'bg-amber-500' : 'bg-blue-500'}`} />
            {stats.isSequential ? 'Secuencial estricto' : 'Avance libre'}
          </span>
        </div>
      </div>
    </section>
  );
};
