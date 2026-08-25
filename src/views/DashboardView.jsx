import React, { useState, useEffect } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Users, Layers, FolderTree, ArrowUpRight, CheckCircle, EyeOff, UserCheck, UserX, RotateCw } from 'lucide-react';

export const DashboardView = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await AdminerApi.getDashboard();
      setStats(data);
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
    const intervalId = setInterval(() => {
      fetchStats();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const statCards = [
    {
      title: 'Cursos en la Plataforma',
      total: stats?.courses_total ?? 0,
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600',
      badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
      tab: 'courses',
      details: [
        { label: 'Visibles', value: stats?.courses_active ?? 0, icon: CheckCircle, textClass: 'text-emerald-600' },
        { label: 'Ocultos', value: stats?.courses_inactive ?? 0, icon: EyeOff, textClass: 'text-amber-600' },
      ],
    },
    {
      title: 'Usuarios Registrados',
      total: stats?.users_total ?? 0,
      icon: Users,
      color: 'from-violet-500 to-purple-600',
      badgeColor: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
      tab: 'users',
      details: [
        { label: 'Activos', value: stats?.users_active ?? 0, icon: UserCheck, textClass: 'text-emerald-600' },
        { label: 'Suspendidos', value: stats?.users_inactive ?? 0, icon: UserX, textClass: 'text-rose-600' },
      ],
    },
    {
      title: 'Cohortes de Usuarios',
      total: stats?.cohorts_total ?? 0,
      icon: Layers,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      tab: 'cohorts',
      details: [
        { label: 'Miembros Totales', value: stats?.cohorts_users_total ?? 0, icon: Users, textClass: 'text-slate-600 dark:text-slate-400' },
      ],
    },
    {
      title: 'Categorías de Cursos',
      total: stats?.categories_total ?? 0,
      icon: FolderTree,
      color: 'from-amber-500 to-orange-600',
      badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      tab: 'categories',
      details: [
        { label: 'Estructura Jerárquica', value: 'Árbol Moodle', icon: FolderTree, textClass: 'text-slate-600 dark:text-slate-400' },
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Resumen General
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo en tiempo real de tu plataforma Moodle 5.x
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

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="relative overflow-hidden group hover:border-primary/50">
              {/* Top gradient accent */}
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
