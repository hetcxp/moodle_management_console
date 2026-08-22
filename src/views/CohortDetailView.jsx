import React, { useState, useEffect, useCallback } from 'react';
import { AdminerApi } from '../services/adminer-api';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/DataTable';
import { SelectorModal } from '../components/ui/SelectorModal';
import { ChevronLeft, ChevronRight, GraduationCap, Users, Layers, Trash2, BookOpen, User } from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';

export const CohortDetailView = ({ cohortId, onBack, onNavigateToDetail, parentLabel }) => {
  const { addToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'courses'
  const [selectorType, setSelectorType] = useState(null); // 'users' | 'courses' | null

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
              <p className="text-sm font-mono text-muted-foreground mt-0.5">{data.idnumber || 'Sin código'}</p>
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
            onRowClick={(row) => onNavigateToDetail('user', row.id)}
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
            onRowClick={(row) => onNavigateToDetail('course', row.id)}
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
    </div>
  );
};
