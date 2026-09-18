import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award, Search, Loader2, Check, Layers } from 'lucide-react';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import { Select } from './Select';
import { useToast } from './Toast';
import { AdminerApi } from '../../services/adminer-api';

export const AssignCompetencyModal = ({
  open,
  onClose,
  onSelect,
  assignedIds = [],
  loading = false,
}) => {
  const { addToast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [frameworkId, setFrameworkId] = useState(0);
  const [competencies, setCompetencies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Cargar lista de marcos cuando se abre el modal
  useEffect(() => {
    if (!open) {
      setFrameworkId(0);
      setSearch('');
      setSelectedId(null);
      setCompetencies([]);
      return;
    }

    let isMounted = true;
    const loadFrameworks = async () => {
      try {
        const res = await AdminerApi.getCompetencyFrameworks({ perpage: 200 });
        if (isMounted) {
          setFrameworks(res?.frameworks || []);
        }
      } catch (err) {
        if (isMounted) {
          addToast({
            type: 'error',
            title: 'Error al cargar marcos',
            description: err.message,
          });
        }
      }
    };

    loadFrameworks();
    return () => {
      isMounted = false;
    };
  }, [open, addToast]);

  // Cargar competencias cada vez que cambia el marco seleccionado
  const fetchCompetencies = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await AdminerApi.getAllCompetencies({ frameworkid: frameworkId });
      const list = Array.isArray(res) ? res : (res?.competencies || []);
      setCompetencies(list);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al cargar competencias',
        description: err.message,
      });
      setCompetencies([]);
    } finally {
      setLoadingData(false);
    }
  }, [frameworkId, addToast]);

  useEffect(() => {
    if (open) {
      fetchCompetencies();
    }
  }, [open, frameworkId, fetchCompetencies]);

  // Filtrado de competencias por búsqueda local
  const filteredCompetencies = useMemo(() => {
    if (!search.trim()) return competencies;
    const q = search.toLowerCase();
    return competencies.filter(c =>
      (c.shortname || '').toLowerCase().includes(q) ||
      (c.idnumber || '').toLowerCase().includes(q) ||
      (c.frameworkname || '').toLowerCase().includes(q)
    );
  }, [competencies, search]);

  const handleToggleSelect = (compId, isAssigned) => {
    if (isAssigned || loading) return;
    setSelectedId(prev => (prev === compId ? null : compId));
  };

  const handleConfirm = () => {
    if (selectedId === null || loading) return;
    onSelect(selectedId);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award className="h-4 w-4" />
          </div>
          <span>Asignar Competencia al Usuario</span>
        </div>
      }
      description="Selecciona una competencia del catálogo institucional para asignarla directamente al plan de aprendizaje individual del usuario."
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedId ? (
              <span className="font-medium text-foreground">1 competencia seleccionada</span>
            ) : (
              <span>Ninguna competencia seleccionada</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedId === null || loading}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Asignando...' : 'Confirmar asignación'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Filtros: Marco y Buscador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Marco de Competencias
            </label>
            <Select
              value={frameworkId}
              onChange={(e) => {
                setFrameworkId(Number(e.target.value));
                setSelectedId(null);
              }}
              disabled={loading}
              className="h-9 text-xs"
            >
              <option value="0">Todos los marcos</option>
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.shortname} {f.idnumber ? `(${f.idnumber})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Buscar competencia
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Nombre, código o marco..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Lista de competencias */}
        <div className="relative border border-border/80 rounded-xl overflow-hidden bg-card/60 min-h-[260px] max-h-[360px] flex flex-col">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Cargando catálogo de competencias...</p>
            </div>
          ) : filteredCompetencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2.5">
                <Award className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No se encontraron competencias</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {search.trim()
                  ? `No hay coincidencias para "${search}". Prueba con otro término o selecciona otro marco.`
                  : 'No hay competencias disponibles en el marco seleccionado.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-y-auto flex-1">
              {filteredCompetencies.map((comp) => {
                const isAssigned = (assignedIds || []).includes(comp.id);
                const isSelected = selectedId === comp.id;

                return (
                  <button
                    type="button"
                    key={comp.id}
                    onClick={() => handleToggleSelect(comp.id, isAssigned)}
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
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {isSelected ? <Check className="h-4 w-4 stroke-[3]" /> : <Award className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {comp.shortname}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                          {comp.idnumber && (
                            <span className="font-mono bg-muted/80 px-1.5 py-0.2 rounded text-[11px]">
                              {comp.idnumber}
                            </span>
                          )}
                          {comp.frameworkname && (
                            <span className="flex items-center gap-1 text-[11px] truncate">
                              <Layers className="h-3 w-3 shrink-0 opacity-70" />
                              {comp.frameworkname}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAssigned ? (
                        <Badge variant="warning" className="text-[11px]">
                          Ya asignada
                        </Badge>
                      ) : isSelected ? (
                        <Badge variant="success" className="text-[11px]">
                          Seleccionada
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
