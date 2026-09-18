import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { PermissionGate } from '../../components/PermissionGate';
import { AddActivityToCompetencyModal } from '../competencies/AddActivityToCompetencyModal';
import {
  useCompetencyCourseAction,
  useModuleCompetencyAction,
  useAllCompetencies,
} from '../../hooks/useAdminerQueries';
import {
  Award,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Eye,
  Info,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
  BookCopy,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  RULE_OUTCOMES,
  getModuleIcon,
  getModuleTypeName,
} from '../competencies/competencyConstants';

export const CourseCompetenciesTab = ({
  competencies = [],
  onNavigateToDetail,
  courseId,
  courseFullname,
}) => {
  const { addToast } = useToast();

  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [addCompetencyOpen, setAddCompetencyOpen] = useState(false);
  const [addCompetencySearch, setAddCompetencySearch] = useState('');
  const [pendingCompetency, setPendingCompetency] = useState(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [addCompetencyRule, setAddCompetencyRule] = useState(3);
  const [addCompetencyLoading, setAddCompetencyLoading] = useState(false);

  const [activityLinkTarget, setActivityLinkTarget] = useState(null);
  const [unlinkCompetencyTarget, setUnlinkCompetencyTarget] = useState(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkActivityTarget, setUnlinkActivityTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [ruleFilter, setRuleFilter] = useState('all');
  const [sortKey, setSortKey] = useState('shortname');
  const [sortDir, setSortDir] = useState('ASC');

  const { mutateAsync: competencyCourseAction } = useCompetencyCourseAction();
  const { mutateAsync: moduleCompetencyAction } = useModuleCompetencyAction();

  const { data: allCompetenciesData } = useAllCompetencies();
  const allFrameworkCompetencies = useMemo(() => {
    return allCompetenciesData?.competencies || [];
  }, [allCompetenciesData]);

  const linkedIds = useMemo(() => new Set(competencies.map((c) => c.id)), [competencies]);
  const availableToAdd = useMemo(() => {
    const q = addCompetencySearch.toLowerCase().trim();
    return allFrameworkCompetencies.filter((c) => {
      if (linkedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        (c.shortname || '').toLowerCase().includes(q) ||
        (c.idnumber || '').toLowerCase().includes(q) ||
        (c.frameworkname || '').toLowerCase().includes(q)
      );
    });
  }, [allFrameworkCompetencies, linkedIds, addCompetencySearch]);

  const uniqueFrameworks = useMemo(() => {
    const map = new Map();
    competencies.forEach((c) => {
      if (c.frameworkid && !map.has(c.frameworkid)) {
        map.set(c.frameworkid, c.frameworkname || `Marco #${c.frameworkid}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [competencies]);

  const filteredCompetencies = useMemo(() => {
    return competencies.filter((c) => {
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
      if (frameworkFilter !== 'all') {
        if (String(c.frameworkid) !== String(frameworkFilter)) return false;
      }
      if (ruleFilter !== 'all') {
        if (String(c.ruleoutcome) !== String(ruleFilter)) return false;
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
      return sortDir === 'ASC'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredCompetencies, sortKey, sortDir]);

  const getRuleConfig = (ruleoutcome) =>
    RULE_OUTCOMES.find((r) => r.value === Number(ruleoutcome)) || {
      value: ruleoutcome,
      label: 'Desconocida',
      fullLabel: 'Regla no identificada',
      description: '',
      colorClass: 'bg-muted text-muted-foreground border-border',
      icon: LinkIcon,
      dotColor: 'bg-muted-foreground',
    };

  const handleOpenDetail = (comp) => {
    setSelectedCompetency(comp);
    setDetailModalOpen(true);
  };

  const handleSelectPendingCompetency = (comp) => {
    setPendingCompetency({ id: comp.id, shortname: comp.shortname });
    setAddCompetencyOpen(false);
    setAddCompetencySearch('');
    setAddCompetencyRule(3);
    setRuleOpen(true);
  };

  const handleConfirmAddCompetency = async () => {
    if (!pendingCompetency || !courseId) return;
    setAddCompetencyLoading(true);
    try {
      await competencyCourseAction({
        action: 'add',
        competencyid: pendingCompetency.id,
        courseids: [courseId],
        ruleoutcome: addCompetencyRule,
      });
      addToast({
        type: 'success',
        title: 'Competencia agregada',
        description: `"${pendingCompetency.shortname}" vinculada al curso.`,
      });
      setRuleOpen(false);
      setPendingCompetency(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al agregar competencia',
        description: err?.message || 'Error desconocido',
      });
    } finally {
      setAddCompetencyLoading(false);
    }
  };

  const handleAddActivity = async (cmid, ruleoutcome) => {
    if (!activityLinkTarget || !courseId) return;
    await moduleCompetencyAction({
      action: 'add',
      competencyid: activityLinkTarget.id,
      cmid,
      ruleoutcome,
    });
    addToast({
      type: 'success',
      title: 'Actividad vinculada',
      description: `Actividad vinculada a "${activityLinkTarget.shortname}".`,
    });
    setActivityLinkTarget(null);
  };

  const handleConfirmUnlinkCompetency = async () => {
    if (!unlinkCompetencyTarget || !courseId) return;
    setUnlinkLoading(true);
    try {
      await competencyCourseAction({
        action: 'remove',
        competencyid: unlinkCompetencyTarget.id,
        courseids: [courseId],
      });
      addToast({
        type: 'success',
        title: 'Competencia desvinculada',
        description: `"${unlinkCompetencyTarget.shortname}" fue desvinculada del curso.`,
      });
      if (selectedCompetency?.id === unlinkCompetencyTarget.id) {
        setDetailModalOpen(false);
        setSelectedCompetency(null);
      }
      setUnlinkCompetencyTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular competencia',
        description: err?.message || 'Error desconocido',
      });
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleConfirmUnlinkActivity = async () => {
    if (!unlinkActivityTarget || !selectedCompetency) return;
    setUnlinkLoading(true);
    try {
      await moduleCompetencyAction({
        action: 'remove',
        competencyid: selectedCompetency.id,
        cmid: unlinkActivityTarget.cmid,
      });
      addToast({
        type: 'success',
        title: 'Actividad desvinculada',
        description: `"${unlinkActivityTarget.name}" fue desvinculada de la competencia.`,
      });
      setSelectedCompetency((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activities: (prev.activities || []).filter((a) => a.cmid !== unlinkActivityTarget.cmid),
        };
      });
      setUnlinkActivityTarget(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al desvincular actividad',
        description: err?.message || 'Error desconocido',
      });
    } finally {
      setUnlinkLoading(false);
    }
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
            <div
              className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                isSubcompetency
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
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
      },
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
      ),
    },
    {
      header: 'Regla al Completar Curso',
      sortKey: 'ruleoutcome',
      cell: (row) => {
        const rule = getRuleConfig(row.ruleoutcome);
        const IconComponent = rule.icon || LinkIcon;
        return (
          <div
            className={`${rule.colorClass} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs`}
            title={rule.description}
          >
            <IconComponent className="h-3.5 w-3.5" />
            <span>{rule.label}</span>
          </div>
        );
      },
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
        const percentage =
          row.progress != null ? row.progress : Math.round((completed / enrolled) * 100);
        return (
          <div className="flex flex-col gap-1 w-full max-w-[130px]">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>
                {completed} / {enrolled}
              </span>
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
      },
    },
    {
      header: 'Actividades Vinculadas',
      sortKey: 'activitiescount',
      className: 'text-center',
      cell: (row) => {
        const count = row.activities?.length || 0;
        return (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {count > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-800 dark:text-purple-300 text-xs font-semibold border border-purple-500/30 shadow-xs">
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-300" />
                <span>
                  {count} {count === 1 ? 'actividad' : 'actividades'}
                </span>
              </div>
            )}
            {courseId ? (
              <PermissionGate
                capability="can_update_courses"
                fallback={
                  count === 0 ? (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sin actividades</span>
                  ) : null
                }
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivityLinkTarget({ id: row.id, shortname: row.shortname });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-sky-500/50 dark:border-sky-400/60 bg-sky-500/15 dark:bg-sky-500/25 text-sky-800 dark:text-sky-200 hover:bg-sky-500/25 dark:hover:bg-sky-500/35 hover:text-sky-950 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                  title="Vincular actividad del curso a esta competencia"
                >
                  <BookCopy className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300 shrink-0" />
                  <span>Vincular actividad</span>
                </button>
              </PermissionGate>
            ) : (
              count === 0 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sin actividades</span>
              )
            )}
          </div>
        );
      },
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
          {courseId && (
            <PermissionGate capability="can_update_courses">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivityLinkTarget({ id: row.id, shortname: row.shortname });
                }}
                className="h-8 w-8 text-purple-600 hover:bg-purple-500/10"
                title="Vincular actividad del curso a esta competencia"
              >
                <BookCopy className="h-4 w-4" />
              </Button>
            </PermissionGate>
          )}
          {courseId && (
            <PermissionGate capability="can_update_courses">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setUnlinkCompetencyTarget(row);
                }}
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Desvincular competencia de este curso"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PermissionGate>
          )}
          {onNavigateToDetail && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToDetail('competency', {
                  frameworkId: row.frameworkid,
                  competencyId: row.id,
                });
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Abrir en Módulo de Competencias"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (competencies.length === 0) {
    return (
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-dashed border-border/80 p-12 text-center shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Award className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No hay competencias vinculadas</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5">
          Este curso aún no tiene competencias asignadas desde los marcos de competencias de la
          plataforma.
        </p>
        {courseId && (
          <PermissionGate capability="can_update_courses">
            <Button
              variant="default"
              size="sm"
              className="mt-5 gap-2"
              onClick={() => setAddCompetencyOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar Competencia
            </Button>
          </PermissionGate>
        )}
        <Dialog
          open={addCompetencyOpen}
          onClose={() => { setAddCompetencyOpen(false); setAddCompetencySearch(''); }}
          title={
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span>Agregar Competencia al Curso</span>
            </div>
          }
          maxWidth="max-w-lg"
        >
          <CompetencySelectorContent
            search={addCompetencySearch}
            onSearchChange={setAddCompetencySearch}
            available={availableToAdd}
            onSelect={handleSelectPendingCompetency}
          />
        </Dialog>
        <RuleOutcomeDialog
          open={ruleOpen}
          onClose={() => setRuleOpen(false)}
          pending={pendingCompetency}
          rule={addCompetencyRule}
          onRuleChange={setAddCompetencyRule}
          loading={addCompetencyLoading}
          onConfirm={handleConfirmAddCompetency}
        />
      </div>
    );
  }

  const selectedRule = selectedCompetency ? getRuleConfig(selectedCompetency.ruleoutcome) : null;
  const SelectedRuleIcon = selectedRule?.icon || LinkIcon;

  return (
    <div className="space-y-4 animate-fadeIn">
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
          {courseId && (
            <PermissionGate capability="can_update_courses">
              <Button
                variant="default"
                size="sm"
                className="gap-2 h-9"
                onClick={() => setAddCompetencyOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Agregar Competencia
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

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

      <Dialog
        open={addCompetencyOpen}
        onClose={() => { setAddCompetencyOpen(false); setAddCompetencySearch(''); }}
        title={
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <span>Agregar Competencia al Curso</span>
          </div>
        }
        maxWidth="max-w-lg"
      >
        <CompetencySelectorContent
          search={addCompetencySearch}
          onSearchChange={setAddCompetencySearch}
          available={availableToAdd}
          onSelect={handleSelectPendingCompetency}
        />
      </Dialog>

      <RuleOutcomeDialog
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        pending={pendingCompetency}
        rule={addCompetencyRule}
        onRuleChange={setAddCompetencyRule}
        loading={addCompetencyLoading}
        onConfirm={handleConfirmAddCompetency}
      />

      {activityLinkTarget && (
        <AddActivityToCompetencyModal
          open={!!activityLinkTarget}
          onClose={() => setActivityLinkTarget(null)}
          course={{ id: courseId, fullname: courseFullname }}
          competencyId={activityLinkTarget.id}
          onAddActivity={handleAddActivity}
        />
      )}

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
            <div className="flex items-center gap-2">
              {onNavigateToDetail && selectedCompetency && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailModalOpen(false);
                    onNavigateToDetail('competency', {
                      frameworkId: selectedCompetency.frameworkid,
                      competencyId: selectedCompetency.id,
                    });
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Ver en Marco de Competencias
                </Button>
              )}
              {courseId && selectedCompetency && (
                <PermissionGate capability="can_update_courses">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnlinkCompetencyTarget(selectedCompetency)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Desvincular del Curso
                  </Button>
                </PermissionGate>
              )}
            </div>
            <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedCompetency && (
          <div className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto pr-1">
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

            {selectedCompetency.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</h4>
                <div
                  className="p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-foreground/90 leading-relaxed max-h-40 overflow-y-auto competency-description-content"
                  dangerouslySetInnerHTML={{ __html: selectedCompetency.description }}
                />
              </div>
            )}

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
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className={`${actRule.colorClass} inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0`}
                            title={actRule.description}
                          >
                            <ActRuleIcon className="h-3 w-3" />
                            <span>{actRule.label}</span>
                          </div>
                          {courseId && (
                            <PermissionGate capability="can_update_courses">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnlinkActivityTarget(act);
                                }}
                                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Desvincular actividad de esta competencia"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          )}
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

      <Dialog
        open={!!unlinkCompetencyTarget}
        onClose={() => {
          if (!unlinkLoading) setUnlinkCompetencyTarget(null);
        }}
        title={
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Desvincular Competencia del Curso</span>
          </div>
        }
        description={`¿Estás seguro de que deseas desvincular "${unlinkCompetencyTarget?.shortname}" de este curso?`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setUnlinkCompetencyTarget(null)}
              disabled={unlinkLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnlinkCompetency}
              disabled={unlinkLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {unlinkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Desvincular Competencia
                </>
              )}
            </Button>
          </div>
        }
      >
        {unlinkCompetencyTarget && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Esta acción eliminará la asociación de la competencia con el curso.
            </p>
            {unlinkCompetencyTarget.activities?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Atención: </span>
                  Se desvincularán automáticamente las{' '}
                  <span className="font-bold">{unlinkCompetencyTarget.activities.length}</span>{' '}
                  {unlinkCompetencyTarget.activities.length === 1 ? 'actividad vinculada' : 'actividades vinculadas'} a
                  esta competencia en el curso para evitar referencias huérfanas.
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!unlinkActivityTarget}
        onClose={() => {
          if (!unlinkLoading) setUnlinkActivityTarget(null);
        }}
        title={
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Desvincular Actividad</span>
          </div>
        }
        description={`¿Estás seguro de que deseas desvincular la actividad "${unlinkActivityTarget?.name}" de esta competencia?`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setUnlinkActivityTarget(null)}
              disabled={unlinkLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnlinkActivity}
              disabled={unlinkLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {unlinkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                'Desvincular Actividad'
              )}
            </Button>
          </div>
        }
      />
    </div>
  );
};

const CompetencySelectorContent = ({ search, onSearchChange, available, onSelect }) => (
  <div className="space-y-3 pt-2">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar competencia por nombre o código..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9 h-9 text-sm"
        autoFocus
      />
    </div>
    <div className="max-h-72 overflow-y-auto rounded-xl border border-border/70 divide-y divide-border/50">
      {available.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {search
            ? 'Sin resultados para esta búsqueda.'
            : 'Todas las competencias ya están vinculadas o no hay marcos configurados.'}
        </div>
      ) : (
        available.map((comp) => (
          <button
            key={comp.id}
            type="button"
            onClick={() => onSelect(comp)}
            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
          >
            <Award className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{comp.shortname}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {comp.idnumber && (
                  <span className="font-mono text-xs text-muted-foreground">{comp.idnumber}</span>
                )}
                {comp.frameworkname && (
                  <span className="text-xs text-muted-foreground">· {comp.frameworkname}</span>
                )}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  </div>
);

const RuleOutcomeDialog = ({ open, onClose, pending, rule, onRuleChange, loading, onConfirm }) => {
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configurar Regla de Competencia"
      description="Configura cómo se contabiliza esta competencia al completar el curso."
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {pending && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">{pending.shortname}</span>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Regla al completar el curso:
          </label>
          <select
            value={rule}
            onChange={(e) => onRuleChange(Number(e.target.value))}
            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {RULE_OUTCOMES.map((ro) => (
              <option key={ro.value} value={ro.value}>
                {ro.fullLabel}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {RULE_OUTCOMES.find((r) => r.value === rule)?.description}
          </p>
        </div>
      </div>
    </Dialog>
  );
};
