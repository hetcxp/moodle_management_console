import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, User, Edit, Hash, FileText, Clock, UserCheck, UserX } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { formatDate } from '../lib/utils';

export const CohortDetailView = ({ cohortId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'courses'
  const [selectorType, setSelectorType] = useState(null); // 'users' | 'courses' | null
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  
  const [courseDetailModalOpen, setCourseDetailModalOpen] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);

  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', idnumber: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCohortDetail(cohortId);
      setData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando cohorte', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [cohortId, addToast, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLink = async (selectedIds) => {
    try {
      if (selectorType === 'users') {
        // userCohortAction expect: action, userid, cohortids. But we have multiple users and one cohort.
        // We can iterate, but it's better if we had an endpoint. However, we have userCohortAction which accepts an array of cohortids.
        // Since we have multiple users and ONE cohort, we have to map over users.
        await Promise.all(selectedIds.map(uid => AdminerApi.userCohortAction('add', uid, [cohortId])));
        addToast({ type: 'success', title: 'Usuario(s) añadidos a la cohorte' });
      } else if (selectorType === 'courses') {
        // courseCohortAction expect: action, courseid, cohortids. 
        await Promise.all(selectedIds.map(cid => AdminerApi.courseCohortAction('add', cid, [cohortId])));
        addToast({ type: 'success', title: 'Curso(s) sincronizados a la cohorte' });
      }
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkUser = async (userId) => {
    try {
      await AdminerApi.userCohortAction('remove', userId, [cohortId]);
      addToast({ type: 'success', title: 'Usuario removido de la cohorte' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al remover usuario', description: err.message });
    }
  };

  const handleUnlinkCourse = async (courseId) => {
    try {
      await AdminerApi.courseCohortAction('remove', courseId, [cohortId]);
      addToast({ type: 'success', title: 'Curso desvinculado de la cohorte' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular curso', description: err.message });
    }
  };

  const handleBulkUnlinkUsers = async (userIds) => {
    try {
      await Promise.all(userIds.map(uid => AdminerApi.userCohortAction('remove', uid, [cohortId])));
      addToast({ type: 'success', title: `${userIds.length} usuario(s) removido(s)` });
      setSelectedUserIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al remover usuarios', description: err.message });
    }
  };

  const handleBulkUnlinkCourses = async (courseIds) => {
    try {
      await Promise.all(courseIds.map(cid => AdminerApi.courseCohortAction('remove', cid, [cohortId])));
      addToast({ type: 'success', title: `${courseIds.length} curso(s) desvinculados` });
      setSelectedCourseIds([]);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular cursos', description: err.message });
    }
  };

  const handleSaveCohort = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await AdminerApi.cohortAction({
        action: 'edit',
        cohortid: cohortId,
        name: formData.name,
        idnumber: formData.idnumber,
        description: formData.description
      });
      addToast({ type: 'success', title: 'Cohorte actualizada' });
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await AdminerApi.cohortAction({ action: 'delete', cohortid: cohortId });
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

  const membersCols = [
    {
      header: 'Usuario',
      sortKey: 'fullname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 font-bold">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground flex items-center gap-2">
              {row.fullname}
              <Badge variant={row.suspended === 0 ? 'success' : 'destructive'} className="text-[10px] px-1 py-0 h-4">
                {row.suspended === 0 ? 'Activo' : 'Suspendido'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Último Acceso',
      sortKey: 'lastaccess',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 opacity-70" />
          {row.lastaccess > 0 ? formatDate(row.lastaccess) : 'Nunca'}
        </div>
      )
    },
    {
      header: 'Progreso',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right">{row.progress || 0}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_manage_cohorts">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkUser(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Remover
          </Button>
        </PermissionGate>
      )
    }
  ];

  const coursesCols = [
    {
      header: 'Curso',
      sortKey: 'fullname',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.shortname}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Inscritos por Cohorte',
      sortKey: 'enrolledcount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {row.enrolledcount} usuarios
        </div>
      )
    },
    {
      header: 'Progreso Promedio',
      sortKey: 'progress',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
            <div
              className={`h-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8 text-right">{row.progress || 0}%</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (row) => (
        <PermissionGate capability="can_manage_courses">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkCourse(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Desvincular
          </Button>
        </PermissionGate>
      )
    }
  ];

  const averageProgress = data.courses && data.courses.length > 0
    ? Math.round(data.courses.reduce((acc, curr) => acc + (curr.progress || 0), 0) / data.courses.length)
    : 0;

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
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('members')}
        >
          Miembros ({data.members.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos Sincronizados ({data.courses.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_cohorts">
              <Button onClick={() => setSelectorType('users')}>
                <User className="h-4 w-4 mr-2" /> Añadir Usuario(s)
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={membersCols}
            data={data.members}
            loading={loading}
            totalCount={data.members.length}
            onRowClick={(row) => { setSelectedUserDetail(row); setUserDetailModalOpen(true); }}
            selectable={true}
            selectedIds={selectedUserIds}
            onSelectionChange={setSelectedUserIds}
            bulkActions={[{
              label: 'Remover Seleccionados',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              onClick: handleBulkUnlinkUsers,
              variant: 'destructive'
            }]}
          />
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => setSelectorType('courses')}>
                <BookOpen className="h-4 w-4 mr-2" /> Sincronizar Curso
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={coursesCols}
            data={data.courses}
            loading={loading}
            totalCount={data.courses.length}
            onRowClick={(row) => { setSelectedCourseDetail(row); setCourseDetailModalOpen(true); }}
            selectable={true}
            selectedIds={selectedCourseIds}
            onSelectionChange={setSelectedCourseIds}
            bulkActions={[{
              label: 'Desvincular Seleccionados',
              icon: <Trash2 className="h-3.5 w-3.5" />,
              onClick: handleBulkUnlinkCourses,
              variant: 'destructive'
            }]}
          />
        </div>
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

      <Dialog
        open={courseDetailModalOpen}
        onClose={() => setCourseDetailModalOpen(false)}
        title={selectedCourseDetail ? `Progreso en: ${selectedCourseDetail.fullname}` : 'Detalle de Progreso'}
        description="Progreso individual de los miembros de la cohorte en este curso."
        footer={
          <>
            <Button variant="outline" onClick={() => setCourseDetailModalOpen(false)}>Cerrar</Button>
            <Button onClick={() => onNavigateToDetail('course', selectedCourseDetail?.id)}>
              Ir al Detalle del Curso
            </Button>
          </>
        }
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {data.members && data.members.length > 0 ? (
            <div className="rounded-md border border-border/70 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {data.members.map(u => {
                    const progress = u.progress || 0; 
                    return (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{u.fullname}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-24 max-w-[100px]">
                              <div
                                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/70 rounded-md">
              No hay usuarios en esta cohorte.
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={userDetailModalOpen}
        onClose={() => setUserDetailModalOpen(false)}
        title={selectedUserDetail ? `Cursos de: ${selectedUserDetail.fullname}` : 'Detalle de Cursos'}
        description="Progreso del usuario en los cursos sincronizados por esta cohorte."
        footer={
          <>
            <Button variant="outline" onClick={() => setUserDetailModalOpen(false)}>Cerrar</Button>
            <Button onClick={() => onNavigateToDetail('user', selectedUserDetail?.id)}>
              Ir al Detalle del Usuario
            </Button>
          </>
        }
      >
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {data.courses && data.courses.length > 0 ? (
            <div className="rounded-md border border-border/70 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Curso</th>
                    <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {data.courses.map(c => {
                    const courseProgressObj = selectedUserDetail?.course_progresses?.find(cp => cp.courseid === c.id);
                    const progress = courseProgressObj ? courseProgressObj.progress : 0;
                    return (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{c.fullname}</div>
                          <div className="text-xs text-muted-foreground">{c.shortname}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-24 max-w-[100px]">
                              <div
                                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/70 rounded-md">
              No hay cursos sincronizados en esta cohorte.
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
