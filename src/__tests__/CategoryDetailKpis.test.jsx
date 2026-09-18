import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryDetailKpis } from '../views/categories/CategoryDetailKpis';

describe('CategoryDetailKpis', () => {
  it('se inicializa elegantemente ante arreglos vacíos o valores undefined', () => {
    render(<CategoryDetailKpis courses={[]} subcategories={[]} />);

    expect(screen.getByRole('region', { name: /indicadores clave de la categoría/i })).toBeDefined();
    expect(screen.getByText('Cursos')).toBeDefined();
    expect(screen.getByText('Subcategorías')).toBeDefined();
    expect(screen.getByText('Matriculados')).toBeDefined();
    expect(screen.getByText('Progreso Promedio')).toBeDefined();

    // Valores en cero
    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByText('0 de 0 culminaciones')).toBeDefined();
    expect(screen.getByText('En 0 cursos con alumnos')).toBeDefined();
    expect(screen.getByText('Estructura anidada')).toBeDefined();
  });

  it('calcula con precisión cursos totales, visibles y ocultos', () => {
    const mockCourses = [
      { id: 1, visible: 1, enrolledcount: 10, completedcount: 5 },
      { id: 2, visible: 1, enrolledcount: 5, completedcount: 2 },
      { id: 3, visible: 0, enrolledcount: 0, completedcount: 0 },
    ];
    const mockSubcategories = [{ id: 10, name: 'Sub 1' }, { id: 11, name: 'Sub 2' }];

    render(<CategoryDetailKpis courses={mockCourses} subcategories={mockSubcategories} />);

    // Total de cursos: 3
    expect(screen.getByText('3')).toBeDefined();
    // 2 activos, 1 oculto
    expect(screen.getByText(/2 activos/i)).toBeDefined();
    expect(screen.getByText(/1 ocultos/i)).toBeDefined();
    // Subcategorías: 2
    expect(screen.getByText('2')).toBeDefined();
  });

  it('suma correctamente las matrículas acumuladas y cursos con alumnos', () => {
    const mockCourses = [
      { id: 1, visible: 1, enrolledcount: 25, completedcount: 10 },
      { id: 2, visible: 1, enrolledcount: 15, completedcount: 5 },
      { id: 3, visible: 1, enrolledcount: 0, completedcount: 0 },
    ];

    render(<CategoryDetailKpis courses={mockCourses} subcategories={[]} />);

    // Total enrolments: 40
    expect(screen.getByText('40')).toBeDefined();
    // Cursos con alumnos: 2
    expect(screen.getByText('En 2 cursos con alumnos')).toBeDefined();
  });

  it('calcula la tasa de culminación promedio con barra visual y evita división por cero', () => {
    // Caso 1: 0 inscripciones
    const { rerender } = render(<CategoryDetailKpis courses={[{ id: 1, enrolledcount: 0, completedcount: 0 }]} subcategories={[]} />);
    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByText('0 de 0 culminaciones')).toBeDefined();

    // Caso 2: 15 completados de 30 inscritos (50%)
    const mockCourses = [
      { id: 1, visible: 1, enrolledcount: 20, completedcount: 10 },
      { id: 2, visible: 1, enrolledcount: 10, completedcount: 5 },
    ];
    rerender(<CategoryDetailKpis courses={mockCourses} subcategories={[]} />);

    expect(screen.getByText('50%')).toBeDefined();
    expect(screen.getByText('15 de 30 culminaciones')).toBeDefined();
  });

  it('maneja caso de 1 solo curso con alumnos con formato singular', () => {
    const mockCourses = [
      { id: 1, visible: 1, enrolledcount: 10, completedcount: 10 },
    ];

    render(<CategoryDetailKpis courses={mockCourses} subcategories={[]} />);

    expect(screen.getByText('En 1 curso con alumnos')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
  });
});
