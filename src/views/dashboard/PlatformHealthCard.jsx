import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { RotateCw, Activity } from 'lucide-react';

export const PlatformHealthCard = ({ loading, health, activeRate, emptyCohorts, inactiveUsers }) => {
  return (
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
              <span className="font-semibold text-foreground">{loading ? '—' : emptyCohorts || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Usuarios suspendidos</span>
              <span className="font-semibold text-foreground">{loading ? '—' : inactiveUsers || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
