import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useCourseDetail, useCourseCohortAction, useCourseUserAction, useCourseAction } from '../hooks/useAdminerQueries';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SelectorModal } from '../components/ui/SelectorModal';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { ChevronLeft, ChevronRight, BookOpen, CalendarClock, Calendar, Edit3, Users, Award } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { formatDateOnly } from '../lib/utils';
import { CourseUsersTab } from './courses/CourseUsersTab';
import { CourseCohortsTab } from './courses/CourseCohortsTab';
import { CourseCompetenciesTab } from './courses/CourseCompetenciesTab';
import { navigateToDetail } from '../lib/navigation';

export const CourseDetailView = ({ courseId, onBack, onNavigateToDetail, parentLabel }) => {
  const [, setLocation] = useLocation();
  const fallbackBack = React.useCallback(() => setLocation('/courses'), [setLocation]);
  const handleBack = onBack || fallbackBack;
  const handleNavigateToDetail = onNavigateToDetail || ((entity, id) => {
    navigateToDetail(setLocation, entity, id);
  });

  const { addToast } = useToast();
  
  const { data, isLoading: loading, error } = useCourseDetail(courseId);
  const { mutateAsync: performCourseCohortAction } = useCourseCohortAction();
  const { mutateAsync: performCourseUserAction } = useCourseUserAction();
  const { mutateAsync: performCourseAction } = useCourseAction();

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Error cargando curso', description: error.message });
      handleBack();
    }
  }, [error, addToast, handleBack]);

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'cohorts' | 'competencies'
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('cohorts'); // 'cohorts' | 'users'

  // Cohort Link Configuration (from SelectorModal)
  const [cohortLinkIds, setCohortLinkIds] = useState([]);
  const [cohortLinkConfigOpen, setCohortLinkConfigOpen] = useState(false);
  const [cohortGroupSelection, setCohortGroupSelection] = useState('0');
  const [cohortNewGroupName, setCohortNewGroupName] = useState('');
  const [cohortExpirationDate, setCohortExpirationDate] = useState('');
  const [cohortExpirationEnabled, setCohortExpirationEnabled] = useState(false);

  // Course Info & Dates Edit
  const [courseEditModalOpen, setCourseEditModalOpen] = useState(false);
  const [courseEditForm, setCourseEditForm] = useState({
    fullname: '',
    shortname: '',
    startdate: '',
    enddate: ''
  });
  const [courseEditErrors, setCourseEditErrors] = useState({});
  const [courseEditLoading, setCourseEditLoading] = useState(false);

  useEffect(() => {
    if (data && !courseEditModalOpen) {
      setCourseEditForm({
        fullname: data.fullname || '',
        shortname: data.shortname || '',
        startdate: data.startdate > 0 ? new Date(data.startdate * 1000).toISOString().split('T')[0] : '',
        enddate: data.enddate > 0 ? new Date(data.enddate * 1000).toISOString().split('T')[0] : ''
      });
      setCourseEditErrors({});
    }
  }, [data, courseEditModalOpen]);

  const handleCohortAction = async (action, cohortIds, options = {}) => {
    try {
      await performCourseCohortAction({ action, courseid: courseId, cohortids: cohortIds, options });
      const actionTitles = { add: 'vinculada(s)', remove: 'desvinculada(s)', suspend: 'suspendida(s)', activate: 'activada(s)', set_group: 'asignada(s) a grupo', set_expiration: 'actualizada(s)', message: 'notificada(s)' };
      addToast({ type: 'success', title: `Cohorte(s) ${actionTitles[action]} exitosamente` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al procesar acción', description: err.message });
    }
  };

  const handleCohortLinkSubmit = async () => {
    const timeend = cohortExpirationEnabled && cohortExpirationDate ? Math.floor(new Date(cohortExpirationDate).getTime() / 1000) : 0;
    await handleCohortAction('add', cohortLinkIds, {
      groupid: cohortGroupSelection === 'new' ? 0 : parseInt(cohortGroupSelection),
      newgroupname: cohortGroupSelection === 'new' ? cohortNewGroupName : '',
      timeend
    });
    setCohortLinkConfigOpen(false);
  };

  const handleUserAction = async (action, userIds, options = {}) => {
    try {
      const { timeend = 0, groupid = 0, newgroupname = '', message_text = '' } = options;
      await performCourseUserAction({ action, courseid: courseId, userids: userIds, timeend, groupid, newgroupname, message_text });
      const actionTitles = { add: 'matriculado(s)', remove: 'desmatriculado(s)', suspend: 'suspendido(s)', activate: 'activado(s)', set_expiration: 'actualizado(s)', setgroup: 'asignado(s) a grupo', message: 'notificado(s)' };
      addToast({ type: 'success', title: `Usuario(s) ${actionTitles[action] || 'procesado(s)'} exitosamente` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al procesar acción', description: err.message });
    }
  };

  const handleUpdateCourse = async (e) => {
    if (e) e.preventDefault();
    const newErrors = {};
    if (!courseEditForm.fullname || courseEditForm.fullname.trim().length < 3) {
      newErrors.fullname = 'El nombre completo debe tener al menos 3 caracteres.';
    }
    if (!courseEditForm.shortname || courseEditForm.shortname.trim().length < 2) {
      newErrors.shortname = 'El nombre corto debe tener al menos 2 caracteres.';
    }
    if (Object.keys(newErrors).length > 0) {
      setCourseEditErrors(newErrors);
      return;
    }

    setCourseEditErrors({});
    setCourseEditLoading(true);
    try {
      await performCourseAction({
        action: 'update',
        courseids: [courseId],
        fullname: courseEditForm.fullname.trim(),
        shortname: courseEditForm.shortname.trim(),
        startdate: courseEditForm.startdate ? (new Date(courseEditForm.startdate).getTime() / 1000) : 0,
        enddate: courseEditForm.enddate ? (new Date(courseEditForm.enddate).getTime() / 1000) : 0
      });
      addToast({ type: 'success', title: 'Curso actualizado exitosamente' });
      setCourseEditModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error al actualizar curso', description: err.message });
    } finally {
      setCourseEditLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={handleBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.fullname}</span>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullname}</h1>
                <PermissionGate capability="can_update_courses">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                    onClick={() => setCourseEditModalOpen(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar curso
                  </Button>
                </PermissionGate>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{data.shortname}</span>
                <span className="hidden sm:inline text-border">•</span>
                <div className="flex items-center gap-1.5" title="Fecha de creación">
                  <Calendar className="h-3.5 w-3.5" />
                  Creado: {formatDateOnly(data.timecreated)}
                </div>
                <div className="flex items-center gap-1.5" title="Inicio / Fin">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {data.startdate > 0 ? formatDateOnly(data.startdate) : 'Sin inicio'} 
                  {' — '} 
                  {data.enddate > 0 ? formatDateOnly(data.enddate) : 'Sin fin'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'users'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Usuarios Inscritos</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.users?.length || 0}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('cohorts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'cohorts'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Cohortes Vinculadas</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.cohorts?.length || 0}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('competencies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'competencies'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Competencias</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.competencies?.length || 0}</Badge>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <CourseUsersTab
          courseId={data.id}
          courseShortname={data.shortname}
          users={data.users}
          coursegroups={data.coursegroups}
          handleUserAction={handleUserAction}
          onNavigateToDetail={handleNavigateToDetail}
          onOpenSelector={() => { setSelectorType('users'); setSelectorOpen(true); }}
        />
      )}

      {activeTab === 'cohorts' && (
        <CourseCohortsTab
          cohorts={data.cohorts || []}
          users={data.users}
          coursegroups={data.coursegroups}
          courseId={data.id}
          handleCohortAction={handleCohortAction}
          onOpenSelector={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}
          onNavigateToDetail={handleNavigateToDetail}
        />
      )}

      {activeTab === 'competencies' && (
        <CourseCompetenciesTab
          competencies={data.competencies || []}
          onNavigateToDetail={handleNavigateToDetail}
        />
      )}

      {/* Modals */}
      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title={selectorType === 'cohorts' ? 'Vincular Cohorte a Curso' : 'Matricular Usuario(s)'}
        entityType={selectorType}
        onSelect={(ids) => {
          if (selectorType === 'cohorts') {
            setSelectorOpen(false);
            setCohortLinkIds(ids);
            setCohortGroupSelection('0');
            setCohortNewGroupName('');
            setCohortExpirationEnabled(false);
            setCohortExpirationDate('');
            setCohortLinkConfigOpen(true);
          } else {
            handleUserAction('add', ids);
            setSelectorOpen(false);
          }
        }}
      />

      {/* Cohort Link Config Modal */}
      <Dialog
        open={cohortLinkConfigOpen}
        onClose={() => setCohortLinkConfigOpen(false)}
        title="Opciones de Vinculación de Cohorte"
        description="Opcionalmente, puedes asignar a los miembros a un grupo del curso y establecer una fecha de expiración."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCohortLinkConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleCohortLinkSubmit}>Vincular</Button>
          </>
        }
      >
        <div className="space-y-6 pt-2">
          {/* Group */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Grupo (Opcional)
            </label>
            <select
              value={cohortGroupSelection}
              onChange={(e) => setCohortGroupSelection(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="0">Ninguno</option>
              {data.coursegroups?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              <option value="new">+ Crear nuevo grupo...</option>
            </select>
            {cohortGroupSelection === 'new' && (
              <Input
                placeholder="Nombre del nuevo grupo"
                value={cohortNewGroupName}
                onChange={(e) => setCohortNewGroupName(e.target.value)}
              />
            )}
          </div>
          
          {/* Expiration */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={cohortExpirationEnabled} 
                onChange={(e) => setCohortExpirationEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Habilitar expiración de matrícula</span>
            </label>
            
            {cohortExpirationEnabled && (
              <Input 
                type="date" 
                value={cohortExpirationDate} 
                onChange={(e) => setCohortExpirationDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>
        </div>
      </Dialog>

      {/* Course Edit Modal */}
      <Dialog
        open={courseEditModalOpen}
        onClose={() => setCourseEditModalOpen(false)}
        title="Editar Información del Curso"
        description="Modifica el nombre, nombre corto y fechas de inicio y fin del curso."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCourseEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCourse} disabled={courseEditLoading}>
              {courseEditLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateCourse} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre Completo del Curso *</label>
            <Input 
              placeholder="Ej: Introducción a Python 3"
              value={courseEditForm.fullname} 
              onChange={(e) => setCourseEditForm({ ...courseEditForm, fullname: e.target.value })} 
              className={courseEditErrors.fullname ? 'border-destructive' : ''}
            />
            {courseEditErrors.fullname && <p className="text-xs text-destructive mt-1">{courseEditErrors.fullname}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre Corto / Código *</label>
            <Input 
              placeholder="Ej: PY3-101"
              value={courseEditForm.shortname} 
              onChange={(e) => setCourseEditForm({ ...courseEditForm, shortname: e.target.value })} 
              className={courseEditErrors.shortname ? 'border-destructive' : ''}
            />
            {courseEditErrors.shortname && <p className="text-xs text-destructive mt-1">{courseEditErrors.shortname}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Fecha de Inicio</label>
              <Input 
                type="date" 
                value={courseEditForm.startdate} 
                onChange={(e) => setCourseEditForm({ ...courseEditForm, startdate: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Deja en blanco para no definir inicio.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Fecha de Fin</label>
              <Input 
                type="date" 
                value={courseEditForm.enddate} 
                onChange={(e) => setCourseEditForm({ ...courseEditForm, enddate: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Deja en blanco para no definir fin.</p>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
