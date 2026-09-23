import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyGuardCard } from '../DependencyGuardCard';
import { LearningPathsTable } from '../LearningPathsTable';
import { LearningPathStructureTab } from '../LearningPathStructureTab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const QueryClientTestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
});
