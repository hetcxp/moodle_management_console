import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import {
  Award,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Eye,
  Info,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import {
  RULE_OUTCOMES,
  getModuleIcon,
  getModuleTypeName
} from '../competencies/competencyConstants';

export const CourseCompetenciesTab = ({
  competencies = [],
  onNavigateToDetail
}) => {
  const [search, setSearch] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [ruleFilter, setRuleFilter] = useState('all');
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Sorting state
  const [sortKey, setSortKey] = useState('shortname');
  const [sortDir, setSortDir] = useState('ASC');

  // Unique Frameworks for filter
  const uniqueFrameworks = useMemo(() => {
    const map = new Map();
    competencies.forEach((c) => {
      if (c.frameworkid && !map.has(c.frameworkid)) {
        map.set(c.frameworkid, c.frameworkname || `Marco #${c.frameworkid}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [competencies]);

  // Filtering & Sorting
  const filteredCompetencies = useMemo(() => {
    return competencies.filter((c) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (c.shortname || '').toLowerCase().includes(q);
        const matchesCode = (c.idnumber || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesFramework = (c.frameworkname || '').toLowerCase().includes(q);
        const matchesParent = (c.parentname || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesFramework && !matchesParent) {
          return false;
        }
      }

      // Framework
      if (frameworkFilter !== 'all') {
        if (String(c.frameworkid) !== String(frameworkFilter)) {
          return false;
        }
      }

      // Rule Outcome
      if (ruleFilter !== 'all') {
        if (String(c.ruleoutcome) !== String(ruleFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [competencies, search, frameworkFilter, ruleFilter]);

  const sortedCompetencies = useMemo(() => {
    return [...filteredCompetencies].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'activitiescount') {
        aVal = a.activities?.length || 0;
        bVal = b.activities?.length || 0;
      }

      if (sortKey === 'completedcount' || sortKey === 'progress') {
        aVal = a.completedcount || 0;
        bVal = b.completedcount || 0;
      }

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal === bVal) return 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'ASC' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredCompetencies, sortKey, sortDir]);

  const getRuleConfig = (ruleoutcome) => {
    return (
      RULE_OUTCOMES.find((r) => r.value === Number(ruleoutcome)) || {
        value: ruleoutcome,
        label: 'Desconocida',
        fullLabel: 'Regla no identificada',
        description: '',
        colorClass: 'bg-muted text-muted-foreground border-border',
        icon: LinkIcon,
        dotColor: 'bg-muted-foreground'
      }
    );
  };

  const handleOpenDetail = (comp) => {
    setSelectedCompetency(comp);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      header: 'Competencia',
      sortKey: 'shortname',
      filterType: 'text',
      cell: (row) => {
        const isSubcompetency = (row.parentid || 0) > 0;
        return (
          <div className="flex items-start gap-3 py-1">
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${isSubcompetency ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-primary/10 text-primary'}`}>
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{row.shortname}</div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {row.idnumber && (
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50">
                    {row.idnumber}
                  </span>
                )}
                {isSubcompetency && row.parentname && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    Padre: <span className="font-semibold">{row.parentname}</span>
                  </span>
                )}
              </div>
              {row.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                  {row.description.replace(/<[^>]*>?/gm, '')}
                </p>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Marco',
      sortKey: 'frameworkname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="font-medium">
            <Layers className="h-3 w-3 mr-1 opacity-70" />
            {row.frameworkname || `Marco #${row.frameworkid}`}
          </Badge>
        </div>
      )
    },
    {
      header: 'Regla al Completar Curso',
      sortKey: 'ruleoutcome',
      cell: (row) => {
        const rule = getRuleConfig(row.ruleoutcome);
        const IconComponent = rule.icon || LinkIcon;
        return (
          <div className={`${rule.colorClass} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs`} title={rule.description}>
            <IconComponent className="h-3.5 w-3.5" />
            <span>{rule.label}</span>
          </div>
        );
      }
    },
    {
      header: 'Progreso',
      sortKey: 'completedcount',
      cell: (row) => {
        const enrolled = row.enrolledcount || 0;
        const completed = row.completedcount || 0;
        if (enrolled === 0) {
          return <span className="text-xs text-muted-foreground italic">Sin inscritos</span>;
        }
        const percentage = row.progress != null ? row.progress : Math.round((completed / enrolled) * 100);
        return (
          <div className="flex flex-col gap-1 w-full max-w-[130px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>{completed} / {enrolled}</span>
              <span className="font-semibold text-foreground">{percentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actividades Vinculadas',
      sortKey: 'activitiescount',
      className: 'text-center',
      cell: (row) => {
        const count = row.activities?.length || 0;
        if (count === 0) {
          return <span className="text-xs text-muted-foreground">Sin actividades</span>;
        }
        return (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-500/20">
            <Sparkles className="h-3 w-3" />
            <span>{count} {count === 1 ? 'actividad' : 'actividades'}</span>
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      className: 'text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetail(row);
            }}
            className="h-8 w-8 text-primary hover:bg-primary/10"
            title="Ver detalles de la competencia en este curso"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onNavigateToDetail && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToDetail('competency', {
                  frameworkId: row.frameworkid,
                  competencyId: row.id
                });
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Abrir en Módulo de Competencias"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (competencies.length === 0) {
    return (
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-dashed border-border/80 p-12 text-center shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Award className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No hay competencias vinculadas</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5">
          Este curso aún no tiene competencias asignadas desde los marcos de competencias de la plataforma.
        </p>
      </div>
    );
  }

  const selectedRule = selectedCompetency ? getRuleConfig(selectedCompetency.ruleoutcome) : null;
  const SelectedRuleIcon = selectedRule?.icon || LinkIcon;

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/40 p-3 rounded-xl border border-border/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o marco..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Framework Filter */}
          {uniqueFrameworks.length > 1 && (
            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Todos los marcos</option>
              {uniqueFrameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          {/* Rule Filter */}
          <select
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Todas las reglas de curso</option>
            {RULE_OUTCOMES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={sortedCompetencies}
        totalCount={sortedCompetencies.length}
        sort={sortKey}
        dir={sortDir}
        onSortChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
        onRowClick={(row) => handleOpenDetail(row)}
        selectable={false}
      />

      {/* Read-Only Competency Detail Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={
          selectedCompetency ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>{selectedCompetency.shortname}</span>
              {selectedCompetency.idnumber && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {selectedCompetency.idnumber}
                </span>
              )}
            </div>
          ) : (
            'Detalle de Competencia'
          )
        }
        description="Información detallada de la vinculación de esta competencia y sus actividades en el curso."
        footer={
          <div className="flex items-center justify-between w-full">
            {onNavigateToDetail && selectedCompetency ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  onNavigateToDetail('competency', {
                    frameworkId: selectedCompetency.frameworkid,
                    competencyId: selectedCompetency.id
                  });
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> Ver en Marco de Competencias
              </Button>
            ) : <div />}
            <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedCompetency && (
          <div className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            {/* Meta Information Cards (Marco & Jerarquía) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Marco de Competencias
                </span>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {selectedCompetency.frameworkname || `Marco #${selectedCompetency.frameworkid}`}
                </p>
                {selectedCompetency.frameworkidnumber && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    ID: {selectedCompetency.frameworkidnumber}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-indigo-500" /> Jerarquía
                </span>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {selectedCompetency.parentid > 0 ? 'Subcompetencia' : 'Competencia Principal'}
                </p>
                {selectedCompetency.parentname && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    Padre: <span className="font-semibold">{selectedCompetency.parentname}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Student Completion Progress */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Progreso de Estudiantes
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {selectedCompetency.completedcount || 0} / {selectedCompetency.enrolledcount || 0} completados
                  <span className="text-muted-foreground ml-1 font-normal">
                    ({selectedCompetency.progress != null ? selectedCompetency.progress : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, selectedCompetency.progress || 0))}%` }}
                />
              </div>
            </div>

            {/* Course Rule Outcome Banner */}
            {selectedRule && (
              <div className="p-4 rounded-xl bg-card border border-border/70 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Regla al completar el curso
                  </span>
                  <div className={`${selectedRule.colorClass} inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border`}>
                    <SelectedRuleIcon className="h-3.5 w-3.5" />
                    <span>{selectedRule.label}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {selectedRule.description}
                </p>
              </div>
            )}

            {/* Description */}
            {selectedCompetency.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</h4>
                <div
                  className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-foreground/90 leading-relaxed max-h-40 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedCompetency.description }}
                />
              </div>
            )}

            {/* Linked Activities */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Actividades del curso vinculadas ({selectedCompetency.activities?.length || 0})
                </h4>
              </div>

              {selectedCompetency.activities && selectedCompetency.activities.length > 0 ? (
                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60">
                  {selectedCompetency.activities.map((act) => {
                    const ModIcon = getModuleIcon(act.modname);
                    const actRule = getRuleConfig(act.ruleoutcome);
                    const ActRuleIcon = actRule.icon || LinkIcon;

                    return (
                      <div key={act.id} className="p-3 bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                            <ModIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{act.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{getModuleTypeName(act.modname)}</span>
                              <span>•</span>
                              <span className="font-mono">cmid #{act.cmid}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`${actRule.colorClass} inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0`} title={actRule.description}>
                          <ActRuleIcon className="h-3 w-3" />
                          <span>{actRule.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground bg-muted/20">
                  No hay actividades individuales de este curso vinculadas directamente a esta competencia.
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
