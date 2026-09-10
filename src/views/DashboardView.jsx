import React from 'react';
import { useDashboardState } from './dashboard/useDashboardState';
import { KpiGrid } from '../components/KpiGrid';
import { Button } from '../components/ui/Button';
import { RotateCw } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { PlatformHealthCard } from './dashboard/PlatformHealthCard';
import { GlobalProgressCard } from './dashboard/GlobalProgressCard';
import { RecentUsersCard, RecentCoursesCard } from './dashboard/RecentActivityCards';
import { QuickActionsCard } from './dashboard/QuickActionsCard';

export const DashboardView = ({ onNavigate, onNavigateToDetail }) => {
  const {
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
  } = useDashboardState(onNavigate, onNavigateToDetail);

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
        <PlatformHealthCard
          loading={loading}
          health={health}
          activeRate={activeRate}
          emptyCohorts={cohortsKpis?.empty_cohorts}
          inactiveUsers={stats?.users_inactive}
        />

        <GlobalProgressCard
          loading={loading}
          avgProgress={usersKpis?.avg_progress}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentUsersCard
          loading={loading}
          recentUsers={recentUsers}
          onNavigate={handleNavigate}
          onNavigateToDetail={handleNavigateToDetail}
        />

        <RecentCoursesCard
          loading={loading}
          recentCourses={recentCourses}
          onNavigate={handleNavigate}
          onNavigateToDetail={handleNavigateToDetail}
        />
      </div>

      <QuickActionsCard onNavigate={handleNavigate} />
    </div>
  );
};
