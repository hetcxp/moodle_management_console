import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '../components/PermissionGate';
import * as AuthContextModule from '../context/AuthContext';

describe('PermissionGate component', () => {
  it('renders fallback when permissions are null', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ permissions: null });

    render(
      <PermissionGate capability="can_create_courses" fallback={<span>Acceso Denegado</span>}>
        <div>Contenido Protegido</div>
      </PermissionGate>
    );

    expect(screen.queryByText('Contenido Protegido')).toBeNull();
    expect(screen.getByText('Acceso Denegado')).toBeDefined();
  });

  it('renders children if user is site admin regardless of capability', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      permissions: { is_siteadmin: 1, can_create_courses: 0 }
    });

    render(
      <PermissionGate capability="can_create_courses" fallback={<span>Acceso Denegado</span>}>
        <div>Contenido Protegido</div>
      </PermissionGate>
    );

    expect(screen.getByText('Contenido Protegido')).toBeDefined();
    expect(screen.queryByText('Acceso Denegado')).toBeNull();
  });

  it('renders children when capability is present and user is not site admin', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      permissions: { is_siteadmin: 0, can_create_courses: 1 }
    });

    render(
      <PermissionGate capability="can_create_courses" fallback={<span>Acceso Denegado</span>}>
        <div>Contenido Protegido</div>
      </PermissionGate>
    );

    expect(screen.getByText('Contenido Protegido')).toBeDefined();
  });

  it('renders fallback when capability is missing and user is not site admin', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      permissions: { is_siteadmin: 0, can_create_courses: 0 }
    });

    render(
      <PermissionGate capability="can_create_courses" fallback={<span>Acceso Denegado</span>}>
        <div>Contenido Protegido</div>
      </PermissionGate>
    );

    expect(screen.queryByText('Contenido Protegido')).toBeNull();
    expect(screen.getByText('Acceso Denegado')).toBeDefined();
  });
});
