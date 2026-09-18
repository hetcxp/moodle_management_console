import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Paperclip, 
  GraduationCap, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  User, 
  Award,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import { FilterBar } from '../../components/FilterBar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { exportToCsv } from '../../components/CsvExporter';

const getActionMeta = (action) => {
  switch (Number(action)) {
    case 0:
      return {
        label: 'Evidencia manual',
        icon: FileText,
        colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    case 1:
      return {
        label: 'Evidencia adjuntada',
        icon: Paperclip,
        colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
      };
    case 2:
      return {
        label: 'Completado en curso',
        icon: GraduationCap,
        colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 3:
      return {
        label: 'Revisión / Calificación',
        icon: Award,
        colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    default:
      return {
        label: 'Registro de competencia',
        icon: CheckCircle2,
        colorClass: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20',
      };
  }
};

export const UserEvidencesTab = ({ competencies = [], userFullname = '' }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('-1');

  const allEvidences = useMemo(() =>
    competencies
      .flatMap((c) =>
        (c.evidences || []).map((e) => ({
          ...e,
          competencyId: c.id,
          competencyName: c.shortname,
          competencyIdNumber: c.idnumber,
          frameworkName: c.frameworkname,
          source: c.source,
        }))
      )
      .sort((a, b) => (b.timecreated || 0) - (a.timecreated || 0)),
    [competencies]
  );

  const filteredEvidences = useMemo(() => {
    return allEvidences.filter((ev) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesComp = (ev.competencyName || '').toLowerCase().includes(q);
        const matchesIdNumber = (ev.competencyIdNumber || '').toLowerCase().includes(q);
        const matchesAuthor = (ev.actionuserfullname || '').toLowerCase().includes(q);
        const matchesNote = (ev.note || '').toLowerCase().includes(q);
        const matchesFramework = (ev.frameworkName || '').toLowerCase().includes(q);
        if (!matchesComp && !matchesIdNumber && !matchesAuthor && !matchesNote && !matchesFramework) {
          return false;
        }
      }

      if (actionFilter !== '-1') {
        if (String(ev.action) !== String(actionFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [allEvidences, search, actionFilter]);

  const handleExport = () => {
    if (!filteredEvidences || filteredEvidences.length === 0) return;
    const cols = [
      { label: 'Competencia', accessor: 'competencyName' },
      { label: 'Código', accessor: 'competencyIdNumber' },
      { label: 'Marco', accessor: 'frameworkName' },
      { label: 'Origen', accessor: 'source' },
      { label: 'Tipo', accessor: 'actionname' },
      { label: 'Autor', accessor: 'actionuserfullname' },
      { label: 'Fecha', accessor: 'timecreated_str' },
      { label: 'Nota', accessor: 'note' },
      { label: 'URL', accessor: 'url' },
    ];
    exportToCsv(`usuario_evidencias`, filteredEvidences, cols);
  };

  return (
    <div className="space-y-6">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por competencia, autor o nota..."
        onExportCsv={filteredEvidences.length > 0 ? handleExport : null}
        filters={[
          {
            id: 'action',
            label: 'Tipo de acción',
            value: actionFilter,
            onChange: setActionFilter,
            options: [
              { label: 'Todos los tipos', value: '-1' },
              { label: 'Evidencia manual', value: '0' },
              { label: 'Evidencia adjuntada', value: '1' },
              { label: 'Completado en curso', value: '2' },
              { label: 'Revisión / Calificación', value: '3' },
            ],
          },
        ]}
      />

      {allEvidences.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Sin evidencias registradas
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {userFullname
              ? `${userFullname} no posee registros de evidencias ni evaluaciones en ninguna competencia asignada.`
              : 'El usuario no posee registros de evidencias en sus competencias asignadas.'}
          </p>
        </div>
      ) : filteredEvidences.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <p className="text-sm font-semibold text-foreground">
            No se encontraron evidencias
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ningún registro coincide con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/70 space-y-4">
          {filteredEvidences.map((ev) => {
            const meta = getActionMeta(ev.action);
            const Icon = meta.icon;

            return (
              <div
                key={ev.id}
                className="relative group bg-card hover:bg-card/80 transition-all rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs"
              >
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-4.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-background shadow-xs shrink-0 ${meta.colorClass}`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 pb-2 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-foreground">
                        {ev.actionname || meta.label}
                      </span>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {meta.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {ev.competencyName}
                      </span>
                      {ev.competencyIdNumber && (
                        <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                          {ev.competencyIdNumber}
                        </span>
                      )}
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{ev.frameworkName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 font-mono">
                    <Calendar className="h-3.5 w-3.5 opacity-70" />
                    <span>{ev.timecreated_str || ''}</span>
                  </div>
                </div>

                <div className="pt-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Registrado por:</span>
                    <span className="font-medium text-foreground">
                      {ev.actionuserfullname || 'Sistema'}
                    </span>
                  </div>

                  {ev.note && (
                    <div className="text-xs sm:text-sm bg-muted/40 p-3 rounded-xl border border-border/60 text-foreground leading-relaxed">
                      {ev.note}
                    </div>
                  )}

                  {ev.descidentifier && !ev.note && (
                    <div className="text-xs text-muted-foreground italic">
                      {ev.descidentifier}
                    </div>
                  )}

                  {ev.url && (
                    <div>
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <span>Ver recurso o actividad externa</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
