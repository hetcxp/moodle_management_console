import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyGuardCard } from '../DependencyGuardCard';
import { LearningPathsTable } from '../LearningPathsTable';
import { LearningPathStructureTab } from '../LearningPathStructureTab';
import { LearningPathEnrolTab } from '../LearningPathEnrolTab';
import { LearningPathCohortsTab } from '../LearningPathCohortsTab';
import { LearningPathUsersTab } from '../LearningPathUsersTab';
import { LearningPathDetailKpis } from '../LearningPathDetailKpis';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../components/ui/Toast';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const QueryClientTestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
  QueryClientTestWrapper.displayName = 'QueryClientTestWrapper';
  return QueryClientTestWrapper;
};

describe('Learning Paths - Frontend Components', () => {
  describe('DependencyGuardCard', () => {
    it('no renderiza nada si no faltan dependencias', () => {
      const { container } = render(<DependencyGuardCard missing={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('muestra badges de plugins faltantes cuando se especifican', () => {
      render(<DependencyGuardCard missing={['mod_subcourse', 'local_subcourseenrol']} />);
      expect(screen.getByText('Dependencias de Moodle requeridas no disponibles')).toBeDefined();
      expect(screen.getByText('mod_subcourse')).toBeDefined();
      expect(screen.getByText('local_subcourseenrol')).toBeDefined();
    });
  });

  describe('LearningPathsTable - Salvaguardas de Eliminación', () => {
    const mockPaths = [
      {
        id: 101,
        fullname: 'Ruta con Alumnos',
        shortname: 'RP-01',
        visible: 1,
        subcourse_count: 3,
        enrolled_count: 15,
        cohort_count: 1,
        startdate: 1700000000,
      },
      {
        id: 102,
        fullname: 'Ruta Vacía',
        shortname: 'RP-02',
        visible: 1,
        subcourse_count: 2,
        enrolled_count: 0,
        cohort_count: 0,
        startdate: 1700000000,
      },
    ];

    it('deshabilita el botón de eliminar cuando hay estudiantes matriculados', () => {
      const onDelete = vi.fn();
      render(
        <LearningPathsTable
          paths={mockPaths}
          totalCount={2}
          onDelete={onDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button');
      const disabledDeleteBtn = deleteButtons.find(
        (btn) => btn.getAttribute('title') === 'No se puede eliminar: hay estudiantes matriculados'
      );
      expect(disabledDeleteBtn).toBeDefined();
      expect(disabledDeleteBtn.disabled).toBe(true);

      // Al hacer click en el botón deshabilitado no debe llamar a onDelete
      fireEvent.click(disabledDeleteBtn);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('habilita el botón de eliminar cuando no hay estudiantes matriculados', () => {
      const onDelete = vi.fn();
      render(
        <LearningPathsTable
          paths={mockPaths}
          totalCount={2}
          onDelete={onDelete}
        />
      );

      const enabledDeleteBtn = screen.getByTitle('Eliminar ruta');
      expect(enabledDeleteBtn).toBeDefined();
      expect(enabledDeleteBtn.disabled).toBe(false);

      fireEvent.click(enabledDeleteBtn);
      expect(onDelete).toHaveBeenCalledWith(mockPaths[1]);
    });

    it('permite ver la ruta/curso en Moodle llamando a onViewInMoodle', () => {
      const onViewInMoodle = vi.fn();
      render(
        <LearningPathsTable
          paths={mockPaths}
          totalCount={2}
          onViewInMoodle={onViewInMoodle}
        />
      );

      const viewBtns = screen.getAllByTitle('Ver en Moodle');
      expect(viewBtns.length).toBe(2);

      fireEvent.click(viewBtns[0]);
      expect(onViewInMoodle).toHaveBeenCalledWith(mockPaths[0].id);
    });
  });

  describe('LearningPathStructureTab - Secuenciación y Reordenamiento', () => {
    const mockPath = {
      id: 200,
      enforce_sequence: false,
      sections: [
        {
          section: 1,
          cm_id: 11,
          subcourse_course_id: 501,
          subcourse_fullname: 'Curso A: Introducción',
          subcourse_shortname: 'CURSO-A',
        },
        {
          section: 2,
          cm_id: 12,
          subcourse_course_id: 502,
          subcourse_fullname: 'Curso B: Intermedio',
          subcourse_shortname: 'CURSO-B',
        },
      ],
    };

    it('renderiza la lista de cursos en el orden secuencial correcto', () => {
      render(<LearningPathStructureTab path={mockPath} onSave={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Curso A: Introducción')).toBeDefined();
      expect(screen.getByText('Curso B: Intermedio')).toBeDefined();
      expect(screen.getByText('Cursos en la Ruta (2)')).toBeDefined();
    });

    it('permite alternar el toggle de prelación secuencial y guardar', () => {
      const onSave = vi.fn();
      render(<LearningPathStructureTab path={mockPath} onSave={onSave} />, {
        wrapper: createWrapper(),
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.checked).toBe(false);

      // Activar prelación
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      // Click guardar
      const saveBtn = screen.getByRole('button', { name: /Guardar Estructura/i });
      fireEvent.click(saveBtn);

      expect(onSave).toHaveBeenCalledWith({
        subcourse_course_ids: [501, 502],
        enforce_sequence: true,
      });
    });

    it('permite ver el subcurso en Moodle desde la estructura', () => {
      const onViewInMoodle = vi.fn();
      render(
        <LearningPathStructureTab
          path={mockPath}
          onSave={vi.fn()}
          onViewInMoodle={onViewInMoodle}
        />,
        { wrapper: createWrapper() }
      );

      const viewBtns = screen.getAllByTitle('Ver curso en Moodle');
      expect(viewBtns.length).toBe(2);

      fireEvent.click(viewBtns[0]);
      expect(onViewInMoodle).toHaveBeenCalledWith(501);
    });
  });

  describe('LearningPathEnrolTab - Gestión de Cohortes y Usuarios', () => {
    const mockPathWithEnrolments = {
      id: 300,
      cohorts: [
        {
          enrol_id: 1,
          cohort_id: 10,
          name: 'Cohorte Ventas 2026',
          member_count: 25,
        },
      ],
      users: [
        {
          id: 55,
          fullname: 'Ana López',
          email: 'ana@example.com',
          status: 0,
          enrol_method: 'manual',
        },
        {
          id: 56,
          fullname: 'Carlos Gómez',
          email: 'carlos@example.com',
          status: 0,
          enrol_method: 'cohort',
        },
      ],
    };

    it('renderiza cohortes sincronizadas y usuarios matriculados con sus badges', () => {
      render(
        <LearningPathEnrolTab
          path={mockPathWithEnrolments}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={vi.fn()}
          onAssignUsers={vi.fn()}
          onRemoveUser={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Cohortes Sincronizadas')).toBeDefined();
      expect(screen.getByText('Cohorte Ventas 2026')).toBeDefined();
      expect(screen.getByText('Usuarios Matriculados')).toBeDefined();
      expect(screen.getByText('Ana López')).toBeDefined();
      expect(screen.getByText('Carlos Gómez')).toBeDefined();
      expect(screen.getByText('Manual')).toBeDefined();
      expect(screen.getByText('Cohorte')).toBeDefined();
    });

    it('permite filtrar usuarios matriculados por texto de búsqueda', () => {
      render(
        <LearningPathEnrolTab
          path={mockPathWithEnrolments}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={vi.fn()}
          onAssignUsers={vi.fn()}
          onRemoveUser={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByPlaceholderText('Buscar usuario...');
      fireEvent.change(searchInput, { target: { value: 'Ana' } });

      expect(screen.getByText('Ana López')).toBeDefined();
      expect(screen.queryByText('Carlos Gómez')).toBeNull();
    });

    it('abre el diálogo de confirmación para desmatricular usuario manual', () => {
      const onRemoveUser = vi.fn();
      render(
        <LearningPathEnrolTab
          path={mockPathWithEnrolments}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={vi.fn()}
          onAssignUsers={vi.fn()}
          onRemoveUser={onRemoveUser}
        />,
        { wrapper: createWrapper() }
      );

      const trashBtn = screen.getByTitle('Desmatricular usuario de la ruta');
      fireEvent.click(trashBtn);

      expect(screen.getByRole('heading', { name: 'Desmatricular Usuario' })).toBeDefined();
      expect(screen.getByText(/¿Estás seguro de que deseas desmatricular a "Ana López"/i)).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: 'Desmatricular Usuario' });
      fireEvent.click(confirmBtn);

      expect(onRemoveUser).toHaveBeenCalledWith(55);
    });

    it('muestra botón para matricular usuario(s) y modal de selección', () => {
      render(
        <LearningPathEnrolTab
          path={mockPathWithEnrolments}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={vi.fn()}
          onAssignUsers={vi.fn()}
          onRemoveUser={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const enrolBtns = screen.getAllByRole('button', { name: /Matricular Usuario\(s\)/i });
      expect(enrolBtns.length).toBeGreaterThan(0);
      fireEvent.click(enrolBtns[0]);

      expect(screen.getByText('Matricular Usuarios en la Ruta')).toBeDefined();
    });

    it('requiere confirmación modal para desvincular cohorte (no desvincula de forma directa)', () => {
      const onRemoveCohort = vi.fn();
      render(
        <LearningPathEnrolTab
          path={mockPathWithEnrolments}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={onRemoveCohort}
          onAssignUsers={vi.fn()}
          onRemoveUser={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      const trashCohortBtn = screen.getByTitle('Desvincular cohorte de la ruta');
      fireEvent.click(trashCohortBtn);

      // No debe ejecutar onRemoveCohort de forma directa
      expect(onRemoveCohort).not.toHaveBeenCalled();

      // Debe abrir el ConfirmDialog
      expect(screen.getByRole('heading', { name: 'Desvincular Cohorte de la Ruta' })).toBeDefined();
      expect(screen.getAllByText(/Cohorte Ventas 2026/i).length).toBeGreaterThanOrEqual(1);

      const confirmBtn = screen.getByRole('button', { name: 'Desvincular Cohorte' });
      fireEvent.click(confirmBtn);

      // Ahora sí se ejecuta con el ID correcto
      expect(onRemoveCohort).toHaveBeenCalledWith(10);
    });
  });

  describe('LearningPathCohortsTab - Desvinculación con Confirmación Requerida (Punto 1)', () => {
    const mockPathCohorts = {
      id: 400,
      cohorts: [
        {
          cohort_id: 25,
          name: 'Cohorte Liderazgo 2026',
          member_count: 40,
        },
      ],
    };

    it('renderiza cohortes asignadas y no desvincula de forma directa al hacer clic', () => {
      const onRemoveCohort = vi.fn();
      render(
        <LearningPathCohortsTab
          path={mockPathCohorts}
          onAssignCohorts={vi.fn()}
          onRemoveCohort={onRemoveCohort}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Cohortes Sincronizadas')).toBeDefined();
      expect(screen.getByText('Cohorte Liderazgo 2026')).toBeDefined();

      const trashBtn = screen.getByTitle('Desvincular cohorte de la ruta');
      fireEvent.click(trashBtn);

      // Asegurar que NO se llama de inmediato
      expect(onRemoveCohort).not.toHaveBeenCalled();

      // Verificar diálogo modal
      expect(screen.getByRole('heading', { name: 'Desvincular Cohorte de la Ruta' })).toBeDefined();
      expect(screen.getByText(/¿Estás seguro de que deseas desvincular la cohorte "Cohorte Liderazgo 2026"/i)).toBeDefined();

      // Confirmar desvinculación
      const confirmBtn = screen.getByRole('button', { name: 'Desvincular Cohorte' });
      fireEvent.click(confirmBtn);

      expect(onRemoveCohort).toHaveBeenCalledWith(25);
    });
  });

  describe('LearningPathUsersTab - Matriculación y Desmatriculación', () => {
    const mockPathUsers = {
      id: 500,
      users: [
        { id: 1, fullname: 'Diana Pérez', email: 'diana@test.com', enrol_method: 'manual', status: 0 },
        { id: 2, fullname: 'Mario Casas', email: 'mario@test.com', enrol_method: 'cohort', status: 1 },
      ],
    };

    it('renderiza lista con badges y abre confirmación para desmatricular usuario manual', () => {
      const onRemoveUser = vi.fn();
      render(
        <LearningPathUsersTab
          path={mockPathUsers}
          onAssignUsers={vi.fn()}
          onRemoveUser={onRemoveUser}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Diana Pérez')).toBeDefined();
      expect(screen.getByText('Mario Casas')).toBeDefined();
      expect(screen.getByText('Manual')).toBeDefined();
      expect(screen.getByText('Cohorte')).toBeDefined();

      const deleteBtn = screen.getByTitle('Desmatricular usuario de la ruta');
      fireEvent.click(deleteBtn);

      expect(onRemoveUser).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Desmatricular Estudiante' })).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: 'Desmatricular' });
      fireEvent.click(confirmBtn);

      expect(onRemoveUser).toHaveBeenCalledWith(1);
    });
  });

  describe('LearningPathDetailKpis - Métricas de Ruta', () => {
    const mockPathKpis = {
      enforce_sequence: 1,
      sections: [
        { id: 1, subcourse_course_id: 101 },
        { id: 2, subcourse_course_id: 102 },
      ],
      users: [
        { id: 1, status: 0, progress: 100 },
        { id: 2, status: 0, progress: 50 },
        { id: 3, status: 1, progress: 0 },
      ],
    };

    it('calcula y despliega las 4 tarjetas de KPIs correctamente', () => {
      render(<LearningPathDetailKpis path={mockPathKpis} />);

      expect(screen.getByText('Matriculados')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined(); // 3 usuarios
      expect(screen.getByText('2 activos')).toBeDefined();
      expect(screen.getByText('1 suspendidos')).toBeDefined();

      expect(screen.getByText('Culminados')).toBeDefined();
      expect(screen.getByText('(33%)')).toBeDefined(); // 1 de 3 completado

      expect(screen.getByText('Avance Promedio')).toBeDefined();
      expect(screen.getByText('50%')).toBeDefined(); // (100+50+0)/3 = 50%

      expect(screen.getByText('Estructura')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined(); // 2 subcursos
      expect(screen.getByText('Secuencial estricto')).toBeDefined();
    });
  });

  describe('UnsavedChangesDialog - Flujo Tripartito (Opción B)', () => {
    it('despliega los 3 botones de acción y emite los eventos esperados', () => {
      const onStay = vi.fn();
      const onDiscard = vi.fn();
      const onSaveAndContinue = vi.fn();

      const { rerender } = render(
        <UnsavedChangesDialog
          open={true}
          onStay={onStay}
          onDiscard={onDiscard}
          onSaveAndContinue={onSaveAndContinue}
        />
      );

      expect(screen.getByText('Cambios sin guardar en la estructura')).toBeDefined();

      const stayBtn = screen.getByRole('button', { name: /Permanecer aquí/i });
      const discardBtn = screen.getByRole('button', { name: /Descartar y salir/i });
      const saveAndContinueBtn = screen.getByRole('button', { name: /Guardar y continuar/i });

      expect(stayBtn).toBeDefined();
      expect(discardBtn).toBeDefined();
      expect(saveAndContinueBtn).toBeDefined();

      fireEvent.click(stayBtn);
      expect(onStay).toHaveBeenCalledTimes(1);

      fireEvent.click(discardBtn);
      expect(onDiscard).toHaveBeenCalledTimes(1);

      fireEvent.click(saveAndContinueBtn);
      expect(onSaveAndContinue).toHaveBeenCalledTimes(1);

      // Estado loading
      rerender(
        <UnsavedChangesDialog
          open={true}
          onStay={onStay}
          onDiscard={onDiscard}
          onSaveAndContinue={onSaveAndContinue}
          loading={true}
        />
      );

      expect(screen.getByText('Guardando...')).toBeDefined();
    });
  });
});
