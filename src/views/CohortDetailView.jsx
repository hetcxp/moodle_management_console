import React, { useState, useEffect } from 'react';
import { useCohortDetail, useCohortAction, useUserCohortAction, useCourseCohortAction } from '../hooks/useAdminerQueries';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, Edit } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { CohortMembersTab } from './cohorts/CohortMembersTab';
import { CohortCoursesTab } from './cohorts/CohortCoursesTab';
import { runWithConcurrency } from '../lib/concurrency';

export const CohortDetailView = ({ cohortId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const { data, isLoading: loading, error } = useCohortDetail(cohortId);
  const cohortAction = useCohortAction();
  const userCohortAction = useUserCohortAction();
  const courseCohortAction = useCourseCohortAction();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'courses'
  const [selectorType, setSelectorType] = useState(null); // 'users' | 'courses' | null

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (error) {
      addToast({ type: 'error', title: 'Error cargando cohorte', description: error.message });
      onBack();
    }
  }, [error, addToast, onBack]);

  const handleLink = async (selectedIds) => {
    try {
      if (selectorType === 'users') {
        await runWithConcurrency(selectedIds, 5, uid => userCohortAction.mutateAsync({ action: 'add', userid: uid, cohortids: [cohortId] }));
        addToast({ type: 'success', title: 'Usuario(s) añadidos a la cohorte' });
      } else if (selectorType === 'courses') {
        await runWithConcurrency(selectedIds, 5, cid => courseCohortAction.mutateAsync({ action: 'add', courseid: cid, cohortids: [cohortId] }));
        addToast({ type: 'success', title: 'Curso(s) sincronizados a la cohorte' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkUser = async (userId) => {
    try {
      await userCohortAction.mutateAsync({ action: 'remove', userid: userId, cohortids: [cohortId] });
      addToast({ type: 'success', title: 'Usuario removido de la cohorte' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al remover usuario', description: err.message });
    }
  };

  const handleUnlinkCourse = async (courseId) => {
    try {
      await courseCohortAction.mutateAsync({ action: 'remove', courseid: courseId, cohortids: [cohortId] });
      addToast({ type: 'success', title: 'Curso desvinculado de la cohorte' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular curso', description: err.message });
    }
  };

  const handleBulkUnlinkUsers = async (userIds) => {
    try {
      await runWithConcurrency(userIds, 5, uid => userCohortAction.mutateAsync({ action: 'remove', userid: uid, cohortids: [cohortId] }));
      addToast({ type: 'success', title: `${userIds.length} usuario(s) removido(s)` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al remover usuarios', description: err.message });
    }
  };

  const handleBulkUnlinkCourses = async (courseIds) => {
    try {
      await runWithConcurrency(courseIds, 5, cid => courseCohortAction.mutateAsync({ action: 'remove', courseid: cid, cohortids: [cohortId] }));
      addToast({ type: 'success', title: `${courseIds.length} curso(s) desvinculados` });
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular cursos', description: err.message });
    }
  };

  const handleSaveCohort = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await cohortAction.mutateAsync({
        action: 'edit',
        cohortid: cohortId,
        name: formData.name,
        idnumber: formData.idnumber,
        description: formData.description
      });
      addToast({ type: 'success', title: 'Cohorte actualizada' });
      setEditModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await cohortAction.mutateAsync({ action: 'delete', cohortid: cohortId });
      addToast({ type: 'success', title: 'Cohorte eliminada' });
      setDeleteConfirmOpen(false);
      onBack();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al eliminar', description: err.message });
    } finally {
      setDeleteLoading(false);
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

  const averageProgress = data.progress !== undefined
    ? data.progress
    : (data.courses && data.courses.length > 0
        ? Math.round(data.courses.reduce((acc, curr) => acc + (curr.progress || 0), 0) / data.courses.length)
        : 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={onBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.name}</span>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1 max-w-2xl">{data.description || 'Sin descripción'}</p>
            </div>
          </div>
        </div>

        {/* Acciones Header */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mt-4 sm:mt-0">
          <PermissionGate capability="can_manage_cohorts">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({ name: data.name, idnumber: data.idnumber, description: data.description });
                setEditModalOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button
              variant="outline"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Grid Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl"><Users className="h-5 w-5 text-emerald-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Miembros</p>
            <h3 className="text-lg font-bold text-foreground">{data.members.length}</h3>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl"><BookOpen className="h-5 w-5 text-blue-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cursos Sincronizados</p>
            <h3 className="text-lg font-bold text-foreground">{data.courses.length}</h3>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border p-5 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl"><GraduationCap className="h-5 w-5 text-purple-500" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avance Promedio</p>
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-lg font-bold text-foreground">{averageProgress}%</h3>
              <div className="h-2 bg-muted rounded-full overflow-hidden w-20">
                <div
                  className={`h-full ${averageProgress === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                  style={{ width: `${averageProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'members'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Miembros</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.members.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'courses'
              ? 'bg-card text-foreground shadow-sm font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Cursos Sincronizados</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{data.courses.length}</Badge>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <CohortMembersTab
          members={data.members}
          courses={data.courses}
          cohortName={data.name}
          loading={loading}
          setSelectorType={setSelectorType}
          handleUnlinkUser={handleUnlinkUser}
          handleBulkUnlinkUsers={handleBulkUnlinkUsers}
          onNavigateToDetail={onNavigateToDetail}
        />
      )}

      {activeTab === 'courses' && (
        <CohortCoursesTab
          courses={data.courses}
          members={data.members}
          loading={loading}
          setSelectorType={setSelectorType}
          handleUnlinkCourse={handleUnlinkCourse}
          handleBulkUnlinkCourses={handleBulkUnlinkCourses}
          onNavigateToDetail={onNavigateToDetail}
        />
      )}

      {/* Modals */}
      <SelectorModal
        open={!!selectorType}
        onClose={() => setSelectorType(null)}
        title={selectorType === 'users' ? 'Añadir Usuarios' : 'Sincronizar Cursos'}
        entityType={selectorType}
        onSelect={handleLink}
      />

      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cohorte"
        description="Configura los detalles del grupo."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCohort} disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCohort} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nombre *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">ID Number / Código</label>
            <Input
              value={formData.idnumber}
              onChange={(e) => setFormData({ ...formData, idnumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Descripción</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar cohorte?"
        description={`¿Estás seguro de que deseas eliminar la cohorte "${data.name}"? Esta acción es irreversible.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </>
        }
      />

    </div>
  );
};
