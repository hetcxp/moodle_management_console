import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, GraduationCap, Users, Layers, Trash2, BookOpen } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { useAuth } from '../context/AuthContext';

export const CourseDetailView = ({ courseId, onBack, onNavigateToDetail }) => {
  const { addToast } = useToast();
  const { permissions } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'cohorts'
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('cohorts'); // 'cohorts' | 'users'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getCourseDetail(courseId);
      setData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando curso', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [courseId, addToast, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkCohorts = async (cohortIds) => {
    try {
      await AdminerApi.courseCohortAction('add', courseId, cohortIds);
      addToast({ type: 'success', title: 'Cohorte(s) vinculada(s) exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkCohort = async (cohortId) => {
    try {
      await AdminerApi.courseCohortAction('remove', courseId, [cohortId]);
      addToast({ type: 'success', title: 'Cohorte desvinculada exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular', description: err.message });
    }
  };

  const handleEnrollUsers = async (userIds) => {
    try {
      await AdminerApi.courseUserAction('add', courseId, userIds);
      addToast({ type: 'success', title: 'Usuario(s) matriculado(s) exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al matricular', description: err.message });
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

  const usersCols = [
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
            <div className="font-semibold text-foreground">{row.fullname}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Progreso',
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
    }
  ];

  const cohortsCols = [
    {
      header: 'Cohorte',
      sortKey: 'name',
      filterType: 'text',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{row.name}</div>
            <div className="text-xs font-mono text-muted-foreground">{row.idnumber || 'Sin código'}</div>
          </div>
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
            onClick={(e) => { e.stopPropagation(); handleUnlinkCohort(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Desvincular
          </Button>
        </PermissionGate>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 text-muted-foreground">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullname}</h1>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{data.shortname}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('users')}
        >
          Usuarios Inscritos ({data.users.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cohorts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('cohorts')}
        >
          Cohortes Vinculadas ({data.cohorts.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('users'); setSelectorOpen(true); }}>
                <Users className="h-4 w-4 mr-2" /> Matricular Usuarios
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={usersCols}
            data={data.users}
            loading={loading}
            totalCount={data.users.length}
            onRowClick={(row) => onNavigateToDetail('user', row.id)}
          />
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}>
                <Layers className="h-4 w-4 mr-2" /> Vincular Cohorte
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={cohortsCols}
            data={data.cohorts}
            loading={loading}
            totalCount={data.cohorts.length}
            onRowClick={(row) => onNavigateToDetail('cohort', row.id)}
          />
        </div>
      )}

      {/* Modals */}
      <SelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title={selectorType === 'cohorts' ? 'Vincular Cohorte a Curso' : 'Matricular Usuario(s)'}
        entityType={selectorType}
        onSelect={selectorType === 'cohorts' ? handleLinkCohorts : handleEnrollUsers}
      />
    </div>
  );
};
