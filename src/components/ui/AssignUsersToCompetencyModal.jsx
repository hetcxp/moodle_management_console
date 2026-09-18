import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Search, Loader2, Check, UserCheck } from 'lucide-react';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';
import { AdminerApi } from '../../services/adminer-api';

export const AssignUsersToCompetencyModal = ({
  open,
  onClose,
  onConfirm,
  assignedUserIds = [],
  loading = false,
  competencyName = '',
}) => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingData, setLoadingData] = useState(false);

  // Cargar usuarios cuando se abre el modal o se busca
  const fetchUsers = useCallback(async (query = '') => {
    setLoadingData(true);
    try {
      const res = await AdminerApi.getUsers({
        search: query.trim(),
        perpage: 50,
        sort: 'lastname',
        dir: 'ASC',
      });
      const list = res?.users || [];
      setUsers(list);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar usuarios',
        description: err.message,
      });
      setUsers([]);
    } finally {
      setLoadingData(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIds(new Set());
      setUsers([]);
      return;
    }
    fetchUsers('');
  }, [open, fetchUsers]);

  // Debounce para búsqueda
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchUsers]);

  const assignedSet = useMemo(() => {
    return new Set((assignedUserIds || []).map(Number));
  }, [assignedUserIds]);

  const handleToggleUser = (userId) => {
    if (loading || assignedSet.has(userId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const selectable = users.filter((u) => !assignedSet.has(Number(u.id)));
    const allSelected = selectable.every((u) => selectedIds.has(Number(u.id)));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((u) => Number(u.id))));
    }
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0 || loading) return;
    onConfirm(Array.from(selectedIds));
  };

  const selectedCount = selectedIds.size;
  const selectableCount = users.filter((u) => !assignedSet.has(Number(u.id))).length;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <span>Vincular Usuarios a la Competencia</span>
        </div>
      }
      description={
        competencyName
          ? `Selecciona los usuarios a los que deseas asignar la competencia "${competencyName}" en su plan individual ad-hoc.`
          : 'Selecciona los usuarios a los que deseas asignar esta competencia en su plan individual ad-hoc.'
      }
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="font-medium text-foreground">
                {selectedCount} usuario(s) seleccionado(s)
              </span>
            ) : (
              <span>Ningún usuario seleccionado</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || loading}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {loading
                  ? 'Asignando...'
                  : selectedCount > 1
                  ? `Asignar ${selectedCount} usuarios`
                  : 'Asignar usuario'}
              </span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Barra de búsqueda y selector rápido */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, apellido o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {selectableCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllVisible}
              disabled={loading}
              className="h-9 text-xs whitespace-nowrap"
            >
              {users.filter((u) => !assignedSet.has(Number(u.id))).every((u) => selectedIds.has(Number(u.id)))
                ? 'Deseleccionar todos'
                : 'Seleccionar visibles'}
            </Button>
          )}
        </div>

        {/* Lista de usuarios */}
        <div className="relative border border-border/80 rounded-xl overflow-hidden bg-card/60 min-h-[260px] max-h-[360px] flex flex-col">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Buscando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2.5">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No se encontraron usuarios</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {search.trim()
                  ? `No hay coincidencias para "${search}". Prueba con otro término.`
                  : 'No hay usuarios disponibles para vincular.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-y-auto flex-1">
              {users.map((user) => {
                const uid = Number(user.id);
                const isAssigned = assignedSet.has(uid);
                const isSelected = selectedIds.has(uid);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleToggleUser(uid)}
                    disabled={isAssigned || loading}
                    className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors ${
                      isAssigned
                        ? 'opacity-60 bg-muted/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary/10 hover:bg-primary/15 cursor-pointer ring-1 ring-inset ring-primary/40'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : isAssigned
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : isAssigned ? (
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {user.fullname || `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                          {user.email && (
                            <span className="truncate">{user.email}</span>
                          )}
                          {user.idnumber && (
                            <span className="font-mono bg-muted/80 px-1.5 py-0.2 rounded text-[11px]">
                              {user.idnumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAssigned ? (
                        <Badge variant="warning" className="text-[11px]">
                          Ya vinculado
                        </Badge>
                      ) : isSelected ? (
                        <Badge variant="success" className="text-[11px]">
                          Seleccionado
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
