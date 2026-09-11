import React, { useState, useMemo } from 'react';
import { BookOpen, Users, Layers, Trash2, Ban, Check, CalendarClock, UserCog, UserPlus, HelpCircle, UserCheck } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PermissionGate } from '../../components/PermissionGate';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { AdminerApi } from '../../services/adminer-api';
import { exportToCsv } from '../../components/CsvExporter';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { usePermission } from '../../hooks/usePermission';

export const UserCoursesTab = ({ 
  courses, 
  loading, 
  userId, 
  onOpenSelector, 
  handleUnenrollCourse, 
  handleBulkUnenrollCourses, 
  handleUserCourseAction,
  onNavigateToDetail,
  _userFullname
}) => {
  const { addToast } = useToast();
  const canManageCourses = usePermission('can_manage_courses');
  const { selectedIds: selectedCourseIds, setSelectedIds: setSelectedCourseIds, clearSelection: clearSelectedCourseIds } = useBulkSelection();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('-1');
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [datesCourseIds, setDatesCourseIds] = useState([]);
  const [datesStartEnabled, setDatesStartEnabled] = useState(false);
  const [datesStartDate, setDatesStartDate] = useState('');
  const [datesEndEnabled, setDatesEndEnabled] = useState(false);
  const [datesEndDate, setDatesEndDate] = useState('');
  
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');
  const [isExporting, setIsExporting] = useState(false);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (c.fullname || '').toLowerCase().includes(q);
        const matchesShort = (c.shortname || '').toLowerCase().includes(q);
        if (!matchesName && !matchesShort) return false;
      }
      if (statusFilter !== '-1') {
        if (String(c.enrolstatus) !== statusFilter) return false;
      }
      return true;
    });
  }, [courses, search, statusFilter]);

  const getEnrolmentIcon = (method, index) => {
    switch (method) {
      case 'manual': return <UserCog key={index} className="h-4 w-4 text-blue-500" title="Manual" />;
      case 'cohort': return <Layers key={index} className="h-4 w-4 text-purple-500" title="Cohorte" />;
      case 'self': return <UserPlus key={index} className="h-4 w-4 text-emerald-500" title="Auto-matriculación" />;
      case 'guest': return <Users key={index} className="h-4 w-4 text-gray-500" title="Invitado" />;
      default: return <HelpCircle key={index} className="h-4 w-4 text-slate-400" title={method || 'Desconocido'} />;
    }
  };

  const handleSetDatesSubmit = async () => {
    const timestart = datesStartEnabled && datesStartDate ? Math.floor(new Date(datesStartDate).getTime() / 1000) : 0;
    const timeend = datesEndEnabled && datesEndDate ? Math.floor(new Date(datesEndDate).getTime() / 1000) : 0;
    await handleUserCourseAction('update_dates', datesCourseIds, { timestart, timeend });
    clearSelectedCourseIds();
    setDatesModalOpen(false);
  };

  const handleBulkSubmit = (ids) => {
    handleBulkUnenrollCourses(ids);
    clearSelectedCourseIds();
  };

  const exportVisibleCSV = () => {
    if (!filteredCourses || filteredCourses.length === 0) return;
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre Corto', accessor: 'shortname' },
      { label: 'Nombre del Curso', accessor: 'fullname' },
      { label: 'Progreso', accessor: row => `${row.progress}%` },
      { label: 'Estado', accessor: row => row.enrolstatus === 0 ? 'Activo' : 'Suspendido' },
      { label: 'Matriculación', accessor: row => row.enrolments?.[0]?.method || 'desconocido' }
    ];
    exportToCsv(`usuario_${userId}_cursos_resumen`, filteredCourses, cols);
  };

  const exportDetailedProgressCSV = async () => {
    if (!filteredCourses || filteredCourses.length === 0) return;
    setIsExporting(true);
    
    try {
      addToast({ type: 'info', title: 'Generando reporte detallado, esto puede tardar unos momentos...' });
      const detailedCourses = [];
      const activityColumns = new Set();
      
      for (const c of filteredCourses) {
        const detail = await AdminerApi.getCourseUserDetail(c.id, userId);
        const activities = detail.activities || [];
        const courseRow = {
          id: c.id,
          shortname: c.shortname,
          fullname: c.fullname,
          progress: c.progress,
          enrolstatus: c.enrolstatus,
          activitiesObj: {}
        };
        
        activities.forEach(act => {
          activityColumns.add(act.name);
          let statusStr = 'Pendiente';
          if (act.completionstatus === 1 || act.completionstatus === 2) {
            statusStr = 'Completado';
          }
          courseRow.activitiesObj[act.name] = `${statusStr} ${act.grade ? '(' + act.grade + ')' : ''}`.trim();
        });
        
        detailedCourses.push(courseRow);
      }
      
      const activityHeaders = Array.from(activityColumns);
      
      const cols = [
        { label: 'ID Curso', accessor: 'id' },
        { label: 'Nombre Corto', accessor: 'shortname' },
        { label: 'Nombre del Curso', accessor: 'fullname' },
        { label: 'Progreso General', accessor: row => `${row.progress}%` },
        { label: 'Estado', accessor: row => row.enrolstatus === 0 ? 'Activo' : 'Suspendido' },
        ...activityHeaders.map(col => ({
          label: col,
          accessor: row => row.activitiesObj[col] || '-'
        }))
      ];
      
      exportToCsv(`usuario_${userId}_cursos_progreso_detallado`, detailedCourses, cols);
      
      addToast({ type: 'success', title: 'Reporte detallado generado exitosamente' });
    } catch (error) {
      addToast({ type: 'error', title: 'Error al generar reporte', description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    if (exportOption === 'visible') {
      exportVisibleCSV();
      setExportModalOpen(false);
    } else {
      await exportDetailedProgressCSV();
      setExportModalOpen(false);
    }
  };

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{row.fullname}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={row.enrolstatus === 0 ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                {row.enrolstatus === 0 ? 'Activo' : 'Suspendido'}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono truncate">{row.shortname}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Matriculaciones',
      accessor: (row) => row.enrolments?.[0]?.method || '',
      sortKey: 'enrolMethod',
      cell: (row) => (
        <div className="flex flex-col gap-2">
          {row.enrolments?.length > 0 ? (
            row.enrolments.map((enr, i) => (
              <div key={i} className="flex items-center gap-2">
                {getEnrolmentIcon(enr.method, i)}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(enr.timestart)} - {enr.timeend ? formatDate(enr.timeend) : 'Sin límite'}
                </span>
              </div>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      )
    },
    {
      header: 'Progreso',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[100px] max-w-[200px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{row.progress}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_update_courses">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={row.enrolmethod !== 'manual'}
              onClick={(e) => { 
                e.stopPropagation(); 
                handleUserCourseAction(row.enrolstatus === 0 ? 'suspend' : 'activate', [row.id]); 
                setSelectedCourseIds([]);
              }}
              className={row.enrolstatus === 0 ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-2' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-2'}
              title={row.enrolmethod !== 'manual' ? "Sólo manual" : (row.enrolstatus === 0 ? 'Suspender' : 'Activar')}
            >
              {row.enrolstatus === 0 ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={row.enrolmethod !== 'manual'}
              onClick={(e) => { 
                e.stopPropagation(); 
                setDatesCourseIds([row.id]);
                const manualEnr = row.enrolments?.find(e => e.method === 'manual');
                if (manualEnr) {
                  setDatesStartEnabled(manualEnr.timestart > 0);
                  setDatesStartDate(manualEnr.timestart > 0 ? new Date(manualEnr.timestart * 1000).toISOString().split('T')[0] : '');
                  setDatesEndEnabled(manualEnr.timeend > 0);
                  setDatesEndDate(manualEnr.timeend > 0 ? new Date(manualEnr.timeend * 1000).toISOString().split('T')[0] : '');
                } else {
                  setDatesStartEnabled(false);
                  setDatesStartDate('');
                  setDatesEndEnabled(false);
                  setDatesEndDate('');
                }
                setDatesModalOpen(true);
              }}
              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2"
              title={row.enrolmethod !== 'manual' ? "Sólo manual" : "Configurar Fechas"}
            >
              <CalendarClock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onNavigateToDetail) {
                  onNavigateToDetail('course_user', { courseId: row.id, userId });
                }
              }}
              className="text-primary hover:text-primary hover:bg-primary/10 px-2"
              title="Ver desempeño en este curso"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); handleUnenrollCourse(row.id); }}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2"
              title="Desmatricular"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </PermissionGate>
      )
    }
  ];

  const getSelectionStatus = (selectedIds, collection) => {
    if (selectedIds.length === 0) return null;
    const selectedItems = collection.filter(item => selectedIds.includes(item.id));
    const manualItems = selectedItems.filter(item => item.enrolmethod === 'manual');
    if (manualItems.length === 0) return 'none_manual';
    
    const allActive = manualItems.every(item => item.enrolstatus === 0);
    const allSuspended = manualItems.every(item => item.enrolstatus === 1);
    
    if (allActive) return 'all_active';
    if (allSuspended) return 'all_suspended';
    return 'mixed';
  };

  const selectionStatus = getSelectionStatus(selectedCourseIds, filteredCourses);
  const manualSelectedIds = filteredCourses.filter(c => selectedCourseIds.includes(c.id) && c.enrolmethod === 'manual').map(c => c.id);

  const bulkActions = [
    ...(selectionStatus === 'all_active' ? [{ label: 'Suspender (Sólo Manual)', onClick: () => { handleUserCourseAction('suspend', manualSelectedIds); setSelectedCourseIds([]); }, variant: 'warning' }] : []),
    ...(selectionStatus === 'all_suspended' ? [{ label: 'Activar (Sólo Manual)', onClick: () => { handleUserCourseAction('activate', manualSelectedIds); setSelectedCourseIds([]); }, variant: 'success' }] : []),
    {
      label: 'Desmatricular Seleccionados',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: handleBulkSubmit,
      variant: 'destructive'
    }
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o código de curso..."
        loading={loading}
        onExportCsv={() => setExportModalOpen(true)}
        primaryAction={canManageCourses ? {
          label: 'Matricular en Curso(s)',
          onClick: onOpenSelector,
          icon: <BookOpen className="h-4 w-4" />
        } : null}
        filters={[
          {
            id: 'status',
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Cualquier Estado', value: '-1' },
              { label: 'Solo Activos', value: '0' },
              { label: 'Solo Suspendidos', value: '1' }
            ]
          }
        ]}
      />

      <DataTable
        columns={coursesCols}
        data={filteredCourses}
        loading={loading}
        totalCount={filteredCourses.length}
        selectable={true}
        selectedIds={selectedCourseIds}
        onSelectionChange={setSelectedCourseIds}
        onRowClick={(row) => onNavigateToDetail('course_user', { courseId: row.id, userId })}
        bulkActions={bulkActions}
      />
      
      <Dialog
        open={datesModalOpen}
        onClose={() => setDatesModalOpen(false)}
        title="Configurar Fechas de Matriculación"
        description="Activa o desactiva las fechas de inicio y expiración de la matriculación manual."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDatesModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSetDatesSubmit}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={datesStartEnabled} 
              onChange={(e) => setDatesStartEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Habilitar fecha de inicio</span>
          </label>
          
          {datesStartEnabled && (
            <div className="space-y-2 mb-4">
              <Input 
                type="date" 
                value={datesStartDate} 
                onChange={(e) => setDatesStartDate(e.target.value)} 
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input 
              type="checkbox" 
              checked={datesEndEnabled} 
              onChange={(e) => setDatesEndEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Habilitar expiración</span>
          </label>
          
          {datesEndEnabled && (
            <div className="space-y-2">
              <Input 
                type="date" 
                value={datesEndDate} 
                onChange={(e) => setDatesEndDate(e.target.value)} 
              />
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Opciones de Exportación"
        description="Selecciona el formato de exportación."
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Generando...' : 'Exportar CSV'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tipo de Exportación</label>
            <select
              value={exportOption}
              onChange={(e) => setExportOption(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="visible">Exportar Resumen (solo información visible)</option>
              <option value="detailed">Exportar con Detalles (incluye progreso de actividades en cada curso)</option>
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
