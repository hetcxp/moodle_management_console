import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { SelectorModal } from '../../components/ui/SelectorModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Layers, Plus, Trash2, Users, UserPlus, Info, Search, Lock } from 'lucide-react';
import { useCohorts } from '../../hooks/useAdminerQueries';

export function LearningPathEnrolTab({
  path,
  onAssignCohorts,
  onRemoveCohort,
  onAssignUsers,
  onRemoveUser,
  loading = false,
}) {
  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [cohortSearch, setCohortSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [cohortToDelete, setCohortToDelete] = useState(null);

  const assignedCohorts = path?.cohorts || [];

  const assignedUsers = useMemo(() => {
    if (path?.users && Array.isArray(path.users)) {
      return path.users;
    }
    // Fallback con progress_matrix si la API previa aún no incluía users
    return (path?.progress_matrix || []).map((p) => ({
      id: p.user_id,
      fullname: p.fullname,
      email: p.email,
      enrol_method: 'manual',
      status: 0,
    }));
  }, [path]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return assignedUsers;
    const term = userSearch.toLowerCase();
    return assignedUsers.filter(
      (u) =>
        (u.fullname && u.fullname.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
    );
  }, [assignedUsers, userSearch]);

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts({
    page: 0,
    perpage: 50,
    search: cohortSearch,
  });

  const availableCohorts = (cohortsData?.cohorts || []).filter(
    (c) => !assignedCohorts.some((ac) => ac.cohort_id === c.id)
  );

  const handleAssignCohort = async () => {
    if (!selectedCohortId) return;
    if (onAssignCohorts) {
      await onAssignCohorts([parseInt(selectedCohortId, 10)]);
      setSelectedCohortId('');
      setCohortModalOpen(false);
    }
  };

  const handleAssignUsersSubmit = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    if (onAssignUsers) {
      await onAssignUsers(selectedIds);
    }
    setUserModalOpen(false);
  };

  const handleConfirmRemoveUser = async () => {
    if (!userToDelete) return;
    if (onRemoveUser) {
      await onRemoveUser(userToDelete.id);
    }
    setUserToDelete(null);
  };

  const handleConfirmRemoveCohort = async () => {
    if (!cohortToDelete) return;
    if (onRemoveCohort) {
      await onRemoveCohort(cohortToDelete.cohort_id);
    }
    setCohortToDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Banner Informativo de Sincronización Automática */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 text-sm text-foreground">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-600 dark:text-blue-400">
            Sincronización Automática de Matrículas en Cascada
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tanto las cohortes asignadas como los usuarios matriculados directamente en esta ruta quedan registrados en el curso contenedor. El plugin
            <span className="font-mono text-xs font-semibold mx-1 text-foreground">local_subcourseenrol</span>
            replicará automáticamente sus accesos a cada uno de los subcursos vinculados a medida que avancen en la secuencia formativa.
          </p>
        </div>
      </div>

      {/* SECCIÓN 1: Cohortes Asignadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Cohortes Sincronizadas</h4>
            <Badge variant="secondary">{assignedCohorts.length}</Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCohortModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
          </Button>
        </div>

        {assignedCohorts.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <Layers className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No hay cohortes asignadas a esta ruta</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Asigna una cohorte para matricular masivamente a grupos de estudiantes en todos los cursos de la ruta.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCohortModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Asignar Cohorte
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignedCohorts.map((coh) => (
              <Card key={coh.enrol_id || coh.cohort_id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>{coh.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{coh.member_count} {coh.member_count === 1 ? 'estudiante' : 'estudiantes'}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Desvincular cohorte de la ruta"
                  disabled={loading}
                  onClick={() => setCohortToDelete(coh)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: Usuarios Matriculados Directamente */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Usuarios Matriculados</h4>
            <Badge variant="secondary">{assignedUsers.length}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {assignedUsers.length > 0 && (
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUserModalOpen(true)}
              className="flex items-center gap-1.5 text-xs shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" /> Matricular Usuario(s)
            </Button>
          </div>
        </div>

        {assignedUsers.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <Users className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No hay usuarios matriculados individualmente</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Puedes matricular usuarios específicos para que cursen esta ruta independientemente de su cohorte.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> Matricular Usuario(s)
            </Button>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <p className="text-xs text-muted-foreground">
              No se encontraron usuarios que coincidan con la búsqueda "{userSearch}".
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-bold text-foreground py-2.5 px-4">Usuario</th>
                  <th className="text-center font-bold text-foreground py-2.5 px-3 w-32">Método</th>
                  <th className="text-center font-bold text-foreground py-2.5 px-3 w-28">Estado</th>
                  <th className="text-right font-bold text-foreground py-2.5 px-4 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => {
                  const isManual = u.enrol_method === 'manual' || !u.enrol_method;
                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                            {u.fullname ? u.fullname.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{u.fullname}</div>
                            <div className="text-[11px] text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={isManual ? 'secondary' : 'outline'}
                          className="text-[10px] uppercase font-mono"
                        >
                          {isManual ? 'Manual' : 'Cohorte'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={u.status === 0 ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {u.status === 0 ? 'Activo' : 'Suspendido'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isManual ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Desmatricular usuario de la ruta"
                            disabled={loading}
                            onClick={() => setUserToDelete(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span
                            className="inline-flex p-1 text-muted-foreground/50"
                            title="Matriculado mediante cohorte sincronizada"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Seleccionar y Asignar Cohorte */}
      <Dialog
        open={cohortModalOpen}
        onClose={() => {
          setCohortModalOpen(false);
          setCohortSearch('');
          setSelectedCohortId('');
        }}
        title="Asignar Cohorte a la Ruta"
        description="Selecciona la cohorte que tendrá acceso a la ruta de aprendizaje."
        footer={
          <>
            <Button variant="outline" onClick={() => setCohortModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignCohort}
              disabled={!selectedCohortId || loading}
            >
              {loading ? 'Asignando...' : 'Asignar Cohorte'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={cohortSearch}
              onChange={(e) => setCohortSearch(e.target.value)}
              placeholder="Filtrar cohortes disponibles..."
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-border/40">
            {cohortsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Cargando cohortes...</div>
            ) : availableCohorts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No hay cohortes adicionales disponibles.
              </div>
            ) : (
              availableCohorts.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    String(selectedCohortId) === String(c.id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{c.idnumber || 'Sin ID'}</div>
                  </div>
                  <input
                    type="radio"
                    name="selectedCohort"
                    value={c.id}
                    checked={String(selectedCohortId) === String(c.id)}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                </label>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {/* Modal para Matricular Usuarios (Reutiliza SelectorModal del sistema) */}
      <SelectorModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Matricular Usuarios en la Ruta"
        entityType="users"
        multiple={true}
        onSelect={handleAssignUsersSubmit}
      />

      {/* Diálogo de Confirmación para Desmatricular Usuario */}
      <ConfirmDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmRemoveUser}
        title="Desmatricular Usuario"
        description={`¿Estás seguro de que deseas desmatricular a "${userToDelete?.fullname}" de esta ruta de aprendizaje? Se removerá su acceso al curso contenedor y a los subcursos asociados.`}
        confirmText="Desmatricular Usuario"
        loading={loading}
        variant="destructive"
      />

      {/* Diálogo de Confirmación para Desvincular Cohorte (Requerimiento 1) */}
      <ConfirmDialog
        open={!!cohortToDelete}
        onClose={() => setCohortToDelete(null)}
        onConfirm={handleConfirmRemoveCohort}
        title="Desvincular Cohorte de la Ruta"
        description={`¿Estás seguro de que deseas desvincular la cohorte "${cohortToDelete?.name}" de esta ruta de aprendizaje? Los estudiantes pertenecientes a la cohorte perderán la sincronización automática con los subcursos.`}
        confirmText="Desvincular Cohorte"
        loading={loading}
        variant="destructive"
      />
    </div>
  );
}

