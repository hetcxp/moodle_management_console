import React from 'react';
import { Sliders, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function ScaleSelector({
  scales = [],
  value = 0,
  onChange,
  onManageScales,
  disabled = false,
}) {
  const selectedScale = scales.find((s) => Number(s.id) === Number(value)) || scales[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground">
          Escala de Evaluación *
        </label>
        {onManageScales && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManageScales}
            className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-1.5 font-medium"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gestionar escalas</span>
          </Button>
        )}
      </div>

      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        disabled={disabled}
      >
        {scales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.isdefault === 1 ? '(Por defecto del sitio)' : ''} ({s.items?.length || 0} niveles)
          </option>
        ))}
      </select>

      {selectedScale && (
        <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Niveles de menor a mayor dominio:
            </span>
            <div className="flex items-center gap-1.5">
              {selectedScale.isdefault === 1 && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  Estándar
                </Badge>
              )}
              {selectedScale.locked === 1 && (
                <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-300 dark:border-amber-700">
                  <Lock className="h-2.5 w-2.5 mr-0.5 inline" /> Bloqueada
                </Badge>
              )}
              {typeof selectedScale.frameworks_count === 'number' && (
                <span className="text-[11px] text-muted-foreground">
                  {selectedScale.frameworks_count} {selectedScale.frameworks_count === 1 ? 'marco' : 'marcos'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedScale.items?.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-foreground font-medium shadow-xs"
              >
                <span className="text-muted-foreground text-[10px]">{idx + 1}.</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
