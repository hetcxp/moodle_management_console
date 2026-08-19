import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { Button } from './Button';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminerApi } from '../../services/adminer-api';
import { Checkbox } from './Checkbox';
import { useToast } from './Toast';

export const SelectorModal = ({
  open,
  onClose,
  title,
  entityType, // 'users', 'courses', 'cohorts'
  onSelect, // (selectedIds) => void
  multiple = true
}) => {
  const { addToast } = useToast();
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (entityType === 'users') {
        const res = await AdminerApi.getUsers({ page, perpage: perPage, search });
        setData(res.users || []);
        setTotalCount(res.totalcount || 0);
      } else if (entityType === 'courses') {
        const res = await AdminerApi.getCourses({ page, perpage: perPage, search });
        setData(res.courses || []);
        setTotalCount(res.totalcount || 0);
      } else if (entityType === 'cohorts') {
        const res = await AdminerApi.getCohorts({ page, perpage: perPage, search });
        setData(res.cohorts || []);
        setTotalCount(res.totalcount || 0);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error de carga', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [entityType, page, perPage, search, addToast]);

  useEffect(() => {
    // Basic debounce
    const timeout = setTimeout(() => {
      if (open) {
        fetchData();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, search, page, fetchData]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setPage(0);
      setSelectedIds([]);
      setData([]);
    }
  }, [open]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleToggleRow = (id) => {
    if (multiple) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  const handleSubmit = () => {
    onSelect(selectedIds);
    onClose();
  };

  const renderRowInfo = (item) => {
    if (entityType === 'users') {
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{item.fullname}</span>
          <span className="text-xs text-muted-foreground">{item.email}</span>
        </div>
      );
    }
    if (entityType === 'courses') {
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{item.fullname}</span>
          <span className="text-xs text-muted-foreground">{item.shortname}</span>
        </div>
      );
    }
    if (entityType === 'cohorts') {
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.idnumber || 'Sin código'} - {item.memberscount} miembros</span>
        </div>
      );
    }
    return null;
  };

  const totalPages = Math.ceil(totalCount / perPage) || 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`Busca y selecciona ${entityType === 'users' ? 'usuarios' : entityType === 'courses' ? 'cursos' : 'cohortes'} para vincular.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
            Aceptar Selección ({selectedIds.length})
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* List */}
        <div className="relative border border-border/80 rounded-lg overflow-hidden bg-card min-h-[300px] max-h-[400px] flex flex-col">
          {loading && data.length === 0 && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            {data.length === 0 && !loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No se encontraron resultados
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => handleToggleRow(item.id)}
                    >
                      <Checkbox
                        id={`select-${item.id}`}
                        checked={isSelected}
                        onChange={() => {}} // Controlled by li onClick
                        className="pointer-events-none"
                      />
                      {renderRowInfo(item)}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 0 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
