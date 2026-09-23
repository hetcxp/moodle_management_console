import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Users, Trash2, UserPlus, Search, Mail, ShieldAlert } from 'lucide-react';
import { useUsers } from '../../hooks/useAdminerQueries';

/**
 * Pestaña especializada para la gestión de usuarios en la ruta de aprendizaje.
 *
 * @param {Object} props
 * @param {Object} props.path
 * @param {(userids: number[]) => Promise<void>} props.onAssignUsers
 * @param {(userid: number) => Promise<void>} props.onRemoveUser
 * @param {boolean} [props.loading]
 */
export function LearningPathUsersTab({
  path,
  onAssignUsers,
  onRemoveUser,
  loading = false,
}) {
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userToDelete, setUserToDelete] = useState(null);

  const assignedUsers = useMemo(() => {
    if (path?.users && Array.isArray(path.users)) {
      return path.users;
    }
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
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term))
    );
  }, [assignedUsers, userSearch]);

  const { data: usersData, isLoading: usersLoading } = useUsers({
    page: 0,
    perpage: 50,
    search: candidateSearch,
  });

  const availableUsers = (usersData?.users || []).filter(
    (u) => !assignedUsers.some((au) => au.id === u.id)
  );

  const handleToggleCandidate = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAssignSubmit = async () => {
    if (!selectedUserIds.length) return;
    if (onAssignUsers) {
      await onAssignUsers(selectedUserIds);
    }
    setSelectedUserIds([]);
    setUserModalOpen(false);
  };

  const handleConfirmRemoveUser = async () => {
    if (!userToDelete) return;
    if (onRemoveUser) {
      await onRemoveUser(userToDelete.id);
    }
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera, Búsqueda y Botón */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">Usuarios Matriculados</h3>
          <Badge variant="secondary">{assignedUsers.length}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {assignedUsers.length > 0 && (
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar matriculado..."
                className="pl-8 text-xs h-9"
              />
            </div>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() => setUserModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-3.5 w-3.5" /> Matricular Usuario(s)
          </Button>
        </div>
      </div>

      {/* Lista de Usuarios */}
      {filteredUsers.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">
            {userSearch ? 'No se encontraron usuarios que coincidan con la búsqueda' : 'No hay usuarios matriculados en esta ruta'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Matricula usuarios individuales o asigna cohortes para concederles acceso formativo.
          </p>
          {!userSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> Matricular Usuario(s)
            </Button>
          )}
        </Card>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => {
                  const isCohort = u.enrol_method === 'cohort';
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.fullname ? u.fullname.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{u.fullname}</p>
                            <p className="text-muted-foreground flex items-center gap-1 text-[11px] truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{u.email || u.username || 'Sin correo'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={isCohort ? 'outline' : 'secondary'} className="text-[10px] capitalize">
                          {isCohort ? (u.cohort_name ? `Cohorte: ${u.cohort_name}` : 'Cohorte') : 'Manual'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={Number(u.status) === 0 ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {Number(u.status) === 0 ? 'Activo' : 'Suspendido'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isCohort ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 italic"
                            title="Gestionado a través de su cohorte vinculada"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" /> Vía Cohorte
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Desmatricular usuario de la ruta"
                            disabled={loading}
                            onClick={() => setUserToDelete(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Matricular Usuarios */}
      <Dialog
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Matricular Usuarios en la Ruta"
        description="Busca y selecciona los estudiantes que deseas matricular directamente en esta ruta."
        footer={
          <>
            <Button variant="outline" onClick={() => setUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              disabled={selectedUserIds.length === 0 || loading}
              onClick={handleAssignSubmit}
            >
              {loading
                ? 'Matriculando...'
                : `Matricular (${selectedUserIds.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido o correo..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border">
            {usersLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Buscando usuarios...</div>
            ) : availableUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No se encontraron usuarios disponibles.
              </div>
            ) : (
              availableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors hover:bg-muted/50 ${
                      isSelected ? 'bg-primary/10 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleCandidate(u.id)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <div>
                        <p className="text-foreground">{u.fullname}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Dialog>

      {/* Confirmación para desmatricular usuario */}
      <ConfirmDialog
        open={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmRemoveUser}
        title="Desmatricular Estudiante"
        description={`¿Estás seguro de que deseas desmatricular a "${userToDelete?.fullname}" de la ruta de aprendizaje? Se revocarán sus accesos sincronizados a los subcursos.`}
        confirmText="Desmatricular"
        cancelText="Cancelar"
        variant="destructive"
        loading={loading}
      />
    </div>
  );
}
