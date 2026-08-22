import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, User } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';

export const UserDetailView = ({ userId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'cohorts'
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState('courses'); // 'courses' | 'cohorts'

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminerApi.getUserDetail(userId);
      setData(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error cargando usuario', description: err.message });
      onBack();
    } finally {
      setLoading(false);
    }
  }, [userId, addToast, onBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkCohorts = async (cohortIds) => {
    try {
      await AdminerApi.userCohortAction('add', userId, cohortIds);
      addToast({ type: 'success', title: 'Usuario vinculado a cohorte(s)' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al vincular', description: err.message });
    }
  };

  const handleUnlinkCohort = async (cohortId) => {
    try {
      await AdminerApi.userCohortAction('remove', userId, [cohortId]);
      addToast({ type: 'success', title: 'Usuario desvinculado exitosamente' });
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error al desvincular', description: err.message });
    }
  };

  const handleEnrollCourses = async (courseIds) => {
    try {
      await AdminerApi.userCourseAction('add', userId, courseIds);
      addToast({ type: 'success', title: 'Usuario matriculado exitosamente' });
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
        <PermissionGate capability="can_manage_cohorts">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleUnlinkCohort(row.id); }}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Remover
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
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm font-medium text-muted-foreground mb-4">
            <button 
              onClick={onBack} 
              className="flex items-center hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {parentLabel || 'Volver'}
            </button>
            <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
            <span className="text-foreground truncate max-w-[300px]">{data.fullname}</span>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 rounded-xl">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullname}</h1>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{data.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/70">
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('courses')}
        >
          Cursos Inscritos ({data.courses.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'cohorts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          onClick={() => setActiveTab('cohorts')}
        >
          Cohortes ({data.cohorts.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_courses">
              <Button onClick={() => { setSelectorType('courses'); setSelectorOpen(true); }}>
                <BookOpen className="h-4 w-4 mr-2" /> Matricular en Curso(s)
              </Button>
            </PermissionGate>
          </div>
          <DataTable
            columns={coursesCols}
            data={data.courses}
            loading={loading}
            totalCount={data.courses.length}
          />
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate capability="can_manage_cohorts">
              <Button onClick={() => { setSelectorType('cohorts'); setSelectorOpen(true); }}>
                <Layers className="h-4 w-4 mr-2" /> Vincular a Cohorte
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
        title={selectorType === 'cohorts' ? 'Vincular a Cohorte' : 'Matricular en Curso(s)'}
        entityType={selectorType}
        onSelect={selectorType === 'cohorts' ? handleLinkCohorts : handleEnrollCourses}
      />
    </div>
  );
};
