import React, { useState, useMemo } from 'react';
import { useCompetencyUsers } from '../../hooks/useAdminerQueries';
import { CompetencyUserEvidencesModal } from './CompetencyUserEvidencesModal';
import { DataTable } from '../../components/DataTable';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { exportToCsv } from '../../components/CsvExporter';
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  BookOpen,
  RotateCcw,
  X,
  Download,
  Filter
} from 'lucide-react';

export const CompetencyUsersTab = ({
  competencyId,
  competencyName,
  courses = [],
  onNavigateToDetail,
  onOpenReviews,
  pendingReviewsCount = 0
}) => {
  const compIdNum = Number(competencyId);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('0');
  const [filterPendingReviews, setFilterPendingReviews] = useState('all');
  const [filterProgress, setFilterProgress] = useState('all');
  const [filterEvidences, setFilterEvidences] = useState('all');

  const [sort, setSort] = useState('fullname');
  const [dir, setDir] = useState('ASC');
  const [page, setPage] = useState(0);
  const perpage = 20;

  const [selectedUserEvidences, setSelectedUserEvidences] = useState(null);

  const hasActiveFilters = Boolean(
    search.trim() ||
    selectedCourse !== '0' ||
    filterStatus !== 'all' ||
    filterPendingReviews !== 'all' ||
    filterProgress !== 'all' ||
    filterEvidences !== 'all'
  );

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCourse('0');
    setFilterStatus('all');
    setFilterPendingReviews('all');
    setFilterProgress('all');
    setFilterEvidences('all');
    setPage(0);
  };

  const queryParams = useMemo(() => ({
    search: search.trim(),
    status: filterStatus === 'all' && filterPendingReviews === 'pending' ? 'pending_reviews' : filterStatus,
    courseid: Number(selectedCourse),
    page,
    perpage,
    sort: sort === 'fullname' ? 'fullname' : 'lastname',
    dir
  }), [search, filterStatus, filterPendingReviews, selectedCourse, page, perpage, sort, dir]);

  const { data, isLoading } = useCompetencyUsers(compIdNum, queryParams);

  const totalCount = data?.totalcount || 0;

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    const users = data?.users || [];
    return users.filter((user) => {
      // Pending reviews filter
      const userPending = user.pendingreviewscount !== undefined
        ? Number(user.pendingreviewscount)
        : (user.status === 1 || user.status === 2 ? 1 : 0);

      if (filterPendingReviews === 'pending' && userPending <= 0) {
        return false;
      }
      if (filterPendingReviews === 'none' && userPending > 0) {
        return false;
      }

      // Progress filter
      const userProg = Number(user.progress || 0);
      if (filterProgress === 'completed' && userProg < 100) {
        return false;
      }
      if (filterProgress === 'in_progress' && (userProg <= 0 || userProg >= 100)) {
        return false;
      }
      if (filterProgress === 'not_started' && userProg > 0) {
        return false;
      }

      // Evidences filter
      const userEvidencesCount = Number(user.evidencescount || 0);
      if (filterEvidences === 'with_evidences' && userEvidencesCount <= 0) {
        return false;
      }
      if (filterEvidences === 'no_evidences' && userEvidencesCount > 0) {
        return false;
      }

      return true;
    });
  }, [data?.users, filterPendingReviews, filterProgress, filterEvidences]);

  // Client-side sorting for all columns
  const sortedUsers = useMemo(() => {
    if (!sort) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      let valA, valB;
      if (sort === 'fullname') {
        valA = a.fullname || '';
        valB = b.fullname || '';
        return dir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sort === 'coursescount') {
        valA = a.coursescount ?? (a.courses?.length || 0);
        valB = b.coursescount ?? (b.courses?.length || 0);
      } else if (sort === 'progress') {
        valA = a.progress || 0;
        valB = b.progress || 0;
      } else if (sort === 'status') {
        valA = a.proficiency ? 2 : (a.status === 1 || a.status === 2 ? 1 : 0);
        valB = b.proficiency ? 2 : (b.status === 1 || b.status === 2 ? 1 : 0);
      } else if (sort === 'pendingreviewscount') {
        valA = a.pendingreviewscount !== undefined
          ? Number(a.pendingreviewscount)
          : (a.status === 1 || a.status === 2 ? 1 : 0);
        valB = b.pendingreviewscount !== undefined
          ? Number(b.pendingreviewscount)
          : (b.status === 1 || b.status === 2 ? 1 : 0);
      } else if (sort === 'evidencescount') {
        valA = a.evidencescount || 0;
        valB = b.evidencescount || 0;
      } else {
        valA = a[sort] ?? '';
        valB = b[sort] ?? '';
      }

      if (valA < valB) return dir === 'ASC' ? -1 : 1;
      if (valA > valB) return dir === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sort, dir]);

  const handleExportCsv = () => {
    const cols = [
      { label: 'ID Usuario', accessor: 'userid' },
      { label: 'Estudiante', accessor: 'fullname' },
      { label: 'Email', accessor: 'email' },
      { label: 'Cursos Vinculados', accessor: (u) => (u.courses || []).map((c) => c.shortname || c.fullname).join('; ') },
      { label: 'Progreso Promedio', accessor: (u) => `${u.progress || 0}%` },
      { label: 'Cursos Completados', accessor: (u) => `${u.completedcoursescount || 0}/${u.coursescount || 0}` },
      { label: 'Estado Competencia', accessor: (u) => u.proficiency === 1 ? 'Competente' : (u.status === 1 || u.status === 2 ? 'En revisión' : 'Aún no competente') },
      { label: 'Calificación', accessor: (u) => u.gradename || '' },
      { label: 'Revisiones Pendientes', accessor: (u) => u.pendingreviewscount !== undefined ? u.pendingreviewscount : (u.status === 1 || u.status === 2 ? 1 : 0) },
      { label: 'Evidencias', accessor: (u) => u.evidencescount || 0 },
    ];
    exportToCsv(`estudiantes_competencia_${compIdNum}`, sortedUsers, cols);
  };

  const columns = [
    {
      header: 'Estudiante',
      accessor: 'fullname',
      sortKey: 'fullname',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
            {getInitials(user.fullname)}
          </div>
          <div className="min-w-0">
            {onNavigateToDetail ? (
              <button
                type="button"
                onClick={() => onNavigateToDetail('user', user.userid)}
                className="font-semibold text-foreground hover:text-primary hover:underline transition-colors truncate text-left block"
              >
                {user.fullname}
              </button>
            ) : (
              <span className="font-semibold text-foreground truncate block">
                {user.fullname}
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate block">
              {user.email}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Cursos Vinculados',
      accessor: (user) => user.coursescount ?? (user.courses?.length || 0),
      sortKey: 'coursescount',
      cell: (user) => (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {user.courses && user.courses.length > 0 ? (
            user.courses.map((c) => (
              <span
                key={c.courseid}
                title={`${c.fullname} - ${c.progress}% completado`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  c.completed === 1
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted/60 text-muted-foreground border-border/80'
                }`}
              >
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]">{c.shortname || c.fullname}</span>
                <span className="font-mono text-[10px] opacity-80">({c.progress}%)</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">Sin cursos matriculados</span>
          )}
        </div>
      )
    },
    {
      header: 'Progreso en Cursos',
      accessor: (user) => user.progress || 0,
      sortKey: 'progress',
      cell: (user) => (
        <div className="space-y-1.5 w-36">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{user.progress}%</span>
            <span className="text-[11px] text-muted-foreground">
              {user.completedcoursescount}/{user.coursescount} hechos
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                user.progress === 100
                  ? 'bg-emerald-500'
                  : user.progress > 0
                  ? 'bg-primary'
                  : 'bg-transparent'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, user.progress))}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Estado Competencia',
      accessor: (user) => user.proficiency ? 'proficient' : (user.status === 1 || user.status === 2 ? 'in_review' : 'not_proficient'),
      sortKey: 'status',
      cell: (user) => {
        const isProficient = user.proficiency === 1;
        const isInReview = user.status === 1 || user.status === 2;

        return (
          <div className="flex flex-col gap-1 items-start">
            {isProficient ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                Competente
              </Badge>
            ) : isInReview ? (
              <Badge variant="warning" className="text-xs font-semibold animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                En Revisión
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                Aún no competente
              </Badge>
            )}

            {user.gradename && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {user.gradename}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Revisiones Pendientes',
      accessor: (user) => user.pendingreviewscount !== undefined
        ? Number(user.pendingreviewscount)
        : (user.status === 1 || user.status === 2 ? 1 : 0),
      sortKey: 'pendingreviewscount',
      className: 'text-center',
      cell: (user) => {
        const userPendingReviews = user.pendingreviewscount !== undefined
          ? Number(user.pendingreviewscount)
          : (user.status === 1 || user.status === 2 ? 1 : 0);

        if (userPendingReviews > 0) {
          return (
            <button
              type="button"
              onClick={() => onOpenReviews && onOpenReviews(user)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title={`Ver ${userPendingReviews} revisión(es) pendiente(s)`}
            >
              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              <span>{userPendingReviews} {userPendingReviews === 1 ? 'pendiente' : 'pendientes'}</span>
            </button>
          );
        }
        return <span className="text-xs text-muted-foreground">-</span>;
      }
    },
    {
      header: 'Evidencias',
      accessor: (user) => user.evidencescount || 0,
      sortKey: 'evidencescount',
      className: 'text-right',
      cell: (user) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedUserEvidences(user)}
          className={`gap-1.5 text-xs h-8 ${
            user.evidencescount > 0
              ? 'border-primary/30 text-primary hover:bg-primary/10'
              : 'text-muted-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Evidencias</span>
          {user.evidencescount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
              {user.evidencescount}
            </span>
          )}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estudiante o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 pr-8 bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(0);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {onOpenReviews && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenReviews()}
                title="Ver revisiones pendientes"
                className="h-9 gap-1.5 shadow-sm border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs shrink-0"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>Revisiones Pendientes</span>
                {pendingReviewsCount > 0 && (
                  <Badge variant="warning" className="ml-0.5 px-1.5 py-0 text-[10px] font-bold">
                    {pendingReviewsCount}
                  </Badge>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={sortedUsers.length === 0}
              className="h-9 gap-1.5 text-xs shrink-0"
              title="Exportar estudiantes filtrados a CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl border border-border/70 bg-card/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </div>

          {courses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setPage(0);
              }}
              className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="0">Todos los cursos ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortname || c.fullname}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="all">Estado: Todos</option>
            <option value="proficient">Competentes</option>
            <option value="not_proficient">Aún no competentes</option>
            <option value="in_review">En revisión</option>
          </select>

          <select
            value={filterPendingReviews}
            onChange={(e) => {
              setFilterPendingReviews(e.target.value);
              setPage(0);
            }}
            className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="all">Revisiones: Todas</option>
            <option value="pending">Con revisiones pendientes</option>
            <option value="none">Sin revisiones pendientes</option>
          </select>

          <select
            value={filterProgress}
            onChange={(e) => {
              setFilterProgress(e.target.value);
              setPage(0);
            }}
            className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="all">Progreso: Todos</option>
            <option value="completed">100% Completado</option>
            <option value="in_progress">En progreso (1% - 99%)</option>
            <option value="not_started">Sin iniciar (0%)</option>
          </select>

          <select
            value={filterEvidences}
            onChange={(e) => {
              setFilterEvidences(e.target.value);
              setPage(0);
            }}
            className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="all">Evidencias: Todas</option>
            <option value="with_evidences">Con evidencias (&gt;0)</option>
            <option value="no_evidences">Sin evidencias (0)</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 ml-auto"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={sortedUsers}
        loading={isLoading}
        totalCount={totalCount}
        page={page}
        perPage={perpage}
        onPageChange={setPage}
        sort={sort}
        dir={dir}
        onSortChange={(newSort, newDir) => {
          setSort(newSort);
          setDir(newDir);
        }}
        onFilterChange={() => {}}
        emptyMessage={
          hasActiveFilters
            ? 'No hay usuarios que coincidan con los filtros aplicados.'
            : 'Aún no hay estudiantes matriculados en los cursos vinculados a esta competencia.'
        }
      />

      {/* Evidences Modal */}
      {selectedUserEvidences && (
        <CompetencyUserEvidencesModal
          open={!!selectedUserEvidences}
          onClose={() => setSelectedUserEvidences(null)}
          user={selectedUserEvidences}
          competencyName={competencyName}
        />
      )}
    </div>
  );
};
