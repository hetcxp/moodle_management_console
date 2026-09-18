import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignCompetencyModal } from '../AssignCompetencyModal';
import { AdminerApi } from '../../../services/adminer-api';
import { ToastProvider } from '../Toast';

vi.mock('../../../services/adminer-api', () => ({
  AdminerApi: {
    getCompetencyFrameworks: vi.fn(),
    getAllCompetencies: vi.fn(),
  },
}));

const mockFrameworks = [
  { id: 1, shortname: 'Habilidades Blandas', idnumber: 'FW-HB-01' },
  { id: 2, shortname: 'Tecnologías TI', idnumber: 'FW-TI-02' },
];

const mockCompetencies = [
  {
    id: 101,
    shortname: 'Liderazgo y Gestión',
    idnumber: 'COMP-LID-01',
    frameworkid: 1,
    frameworkname: 'Habilidades Blandas',
  },
  {
    id: 102,
    shortname: 'Programación en Python',
    idnumber: 'COMP-PY-02',
    frameworkid: 2,
    frameworkname: 'Tecnologías TI',
  },
  {
    id: 103,
    shortname: 'Trabajo en Equipo',
    idnumber: 'COMP-EQ-03',
    frameworkid: 1,
    frameworkname: 'Habilidades Blandas',
  },
];

function renderModal(props = {}) {
  return render(
    <ToastProvider>
      <AssignCompetencyModal
        open={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        assignedIds={[]}
        loading={false}
        {...props}
      />
    </ToastProvider>
  );
}

describe('AssignCompetencyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminerApi.getCompetencyFrameworks.mockResolvedValue({ frameworks: mockFrameworks });
    AdminerApi.getAllCompetencies.mockResolvedValue({ competencies: mockCompetencies });
  });

  it('renders modal with frameworks and competencies list', async () => {
    renderModal();

    expect(screen.getByText('Asignar Competencia al Usuario')).toBeDefined();

    await waitFor(() => {
      expect(AdminerApi.getCompetencyFrameworks).toHaveBeenCalledWith({ perpage: 200 });
      expect(AdminerApi.getAllCompetencies).toHaveBeenCalledWith({ frameworkid: 0 });
    });

    await waitFor(() => {
      expect(screen.getByText('Liderazgo y Gestión')).toBeDefined();
      expect(screen.getByText('Programación en Python')).toBeDefined();
      expect(screen.getByText('Trabajo en Equipo')).toBeDefined();
    });
  });

  it('marks already assigned competencies as disabled and shows "Ya asignada" badge', async () => {
    renderModal({ assignedIds: [102] });

    await waitFor(() => {
      expect(screen.getByText('Programación en Python')).toBeDefined();
    });

    expect(screen.getByText('Ya asignada')).toBeDefined();

    // El botón de la fila de Python debe estar deshabilitado
    const pythonBtn = screen.getByText('Programación en Python').closest('button');
    expect(pythonBtn?.disabled).toBe(true);

    // El botón de la fila de Liderazgo debe estar habilitado
    const liderazgoBtn = screen.getByText('Liderazgo y Gestión').closest('button');
    expect(liderazgoBtn?.disabled).toBe(false);
  });

  it('allows selecting an unassigned competency and calls onSelect on confirm', async () => {
    const onSelect = vi.fn();
    renderModal({ onSelect, assignedIds: [102] });

    await waitFor(() => {
      expect(screen.getByText('Liderazgo y Gestión')).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar asignación/i });
    expect(confirmBtn.disabled).toBe(true);

    // Click en la fila de Liderazgo
    const liderazgoBtn = screen.getByText('Liderazgo y Gestión').closest('button');
    fireEvent.click(liderazgoBtn);

    expect(screen.getByText('Seleccionada')).toBeDefined();
    expect(confirmBtn.disabled).toBe(false);

    // Confirmar
    fireEvent.click(confirmBtn);
    expect(onSelect).toHaveBeenCalledWith(101);
  });

  it('filters competencies using the search input', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Liderazgo y Gestión')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Nombre, código o marco...');
    fireEvent.change(searchInput, { target: { value: 'Python' } });

    expect(screen.queryByText('Liderazgo y Gestión')).toBeNull();
    expect(screen.getByText('Programación en Python')).toBeDefined();
  });

  it('calls onClose when Cancelar button is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    await waitFor(() => {
      expect(screen.getByText('Liderazgo y Gestión')).toBeDefined();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
