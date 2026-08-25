import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { ArrowUpRight } from 'lucide-react';

export const KpiGrid = ({ items, loading, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card key={idx} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${item.color || 'from-primary to-primary/50'}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {item.title}
              </span>
              <div className={`p-2.5 rounded-xl ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
                {Icon && <Icon className="h-5 w-5" />}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {loading ? '—' : (typeof item.value === 'number' ? item.value.toLocaleString() : item.value)}
              </div>

              {!loading && typeof item.progress === 'number' && (
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${item.color || 'from-primary to-primary/50'}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.details && item.details.length > 0 && (
                <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                  {item.details.map((d, dIdx) => {
                    const DetailIcon = d.icon;
                    return (
                      <div key={dIdx} className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          {DetailIcon && <DetailIcon className="h-3.5 w-3.5 opacity-70" />}
                          {d.label}
                        </span>
                        <span className={`font-semibold ${d.textClass || ''}`}>
                          {loading
                            ? '—'
                            : typeof d.value === 'number'
                            ? d.value.toLocaleString()
                            : d.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {item.tab && onNavigate && (
                <button
                  onClick={() => onNavigate(item.tab)}
                  className="flex items-center justify-between w-full pt-1 text-xs font-semibold text-primary hover:underline group/link"
                >
                  <span>Ver listado detallado</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
