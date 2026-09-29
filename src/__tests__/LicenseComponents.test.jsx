import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LicenseModal } from '../components/LicenseModal';
import { LicenseBanner } from '../components/LicenseBanner';
import { LicensedActionButton } from '../components/PermissionGate';
import { Header } from '../components/Header';
import { AppSidebar } from '../components/AppSidebar';
import * as AuthContextModule from '../context/AuthContext';
import * as LicenseUiContextModule from '../context/LicenseUiContext';
import * as HelpContextModule from '../context/HelpContext';
import { AdminerApi } from '../services/adminer-api';

describe('License UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LicenseModal', () => {
    it('displays the site ID and allows inputting an activation key', async () => {
      const activateLicenseMock = vi.fn().mockResolvedValue({
        valid: true,
        client_name: 'Universidad Demo',
        expires_at: 1780000000,
        days_left: 30,
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        siteId: 'site-uuid-12345',
        activateLicense: activateLicenseMock,
        removeLicense: vi.fn(),
        isLicensed: false,
        licenseDaysLeft: 0,
        licenseExpiresAt: 0,
      });

      render(<LicenseModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByDisplayValue('site-uuid-12345')).toBeDefined();
      const textarea = screen.getByPlaceholderText(/Pega aquí la clave de licencia/i);
      fireEvent.change(textarea, { target: { value: 'TMC-validkey.sig' } });

      const submitBtn = screen.getByRole('button', { name: /Activar Licencia/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(activateLicenseMock).toHaveBeenCalledWith('TMC-validkey.sig');
        expect(screen.getByText('¡Licencia activada con éxito!')).toBeDefined();
        expect(screen.getByText(/Universidad Demo/)).toBeDefined();
      });
    });

    it('displays error message when activation fails', async () => {
      const activateLicenseMock = vi.fn().mockResolvedValue({
        valid: false,
        status: 'site_mismatch',
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        siteId: 'site-uuid-12345',
        activateLicense: activateLicenseMock,
        removeLicense: vi.fn(),
        isLicensed: false,
        licenseDaysLeft: 0,
        licenseExpiresAt: 0,
      });

      render(<LicenseModal isOpen={true} onClose={() => {}} />);

      const textarea = screen.getByPlaceholderText(/Pega aquí la clave de licencia/i);
      fireEvent.change(textarea, { target: { value: 'TMC-badsite.sig' } });

      const submitBtn = screen.getByRole('button', { name: /Activar Licencia/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('La clave no corresponde a este sitio.')).toBeDefined();
      });
    });

    it('displays detailed active license metadata when licensed', async () => {
      vi.spyOn(AdminerApi, 'getLicenseInfo').mockResolvedValue({
        valid: true,
        status: 'active',
        client_name: 'Universidad Central',
        tier: 'enterprise',
        license_id: 'LIC-ENTERPRISE-99',
        expires_at: 1780000000,
        days_left: 45,
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        siteId: 'site-uuid-12345',
        activateLicense: vi.fn(),
        removeLicense: vi.fn(),
        isLicensed: true,
        licenseDaysLeft: 45,
        licenseExpiresAt: 1780000000,
      });

      render(<LicenseModal isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('Licencia activa')).toBeDefined();
        expect(screen.getByText('Universidad Central')).toBeDefined();
        expect(screen.getByText('LIC-ENTERPRISE-99')).toBeDefined();
        expect(screen.getByText(/45 días/)).toBeDefined();
      });

      // Verify remove button is rendered when licensed
      expect(screen.getByRole('button', { name: /Remover Licencia/i })).toBeDefined();
    });

    it('executes license removal flow with ConfirmDialog', async () => {
      const removeLicenseMock = vi.fn().mockResolvedValue({ success: true });

      vi.spyOn(AdminerApi, 'getLicenseInfo').mockResolvedValue({
        valid: true,
        status: 'active',
        client_name: 'Universidad Central',
        tier: 'enterprise',
        license_id: 'LIC-ENTERPRISE-99',
        expires_at: 1780000000,
        days_left: 45,
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        siteId: 'site-uuid-12345',
        activateLicense: vi.fn(),
        removeLicense: removeLicenseMock,
        isLicensed: true,
        licenseDaysLeft: 45,
        licenseExpiresAt: 1780000000,
      });

      render(<LicenseModal isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('Universidad Central')).toBeDefined();
      });

      // Click remove button to open ConfirmDialog
      const removeBtn = screen.getByRole('button', { name: /Remover Licencia/i });
      fireEvent.click(removeBtn);

      // Verify ConfirmDialog opens
      expect(screen.getByText('¿Remover licencia activa?')).toBeDefined();

      // Find confirm button in dialog (the destructive one inside ConfirmDialog)
      const confirmBtns = screen.getAllByRole('button', { name: /Remover Licencia/i });
      const dialogConfirmBtn = confirmBtns[confirmBtns.length - 1];
      fireEvent.click(dialogConfirmBtn);

      await waitFor(() => {
        expect(removeLicenseMock).toHaveBeenCalled();
        expect(screen.getByText(/Licencia removida correctamente/i)).toBeDefined();
      });
    });
  });

  describe('LicenseBanner', () => {
    it('does not render when license is active with more than 7 days left', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { can_config_site: 1, is_siteadmin: 1 },
        licenseStatus: 'active',
        licenseDaysLeft: 30,
        licenseExpiresAt: 1780000000,
      });

      const { container } = render(<LicenseBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('renders warning and allows dismiss when active with <= 7 days left', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { can_config_site: 1, is_siteadmin: 1 },
        licenseStatus: 'active',
        licenseDaysLeft: 5,
        licenseExpiresAt: 1780000000,
      });

      render(<LicenseBanner />);
      expect(screen.getByText(/La licencia vence en 5 días/i)).toBeDefined();

      const dismissBtn = screen.getByLabelText(/Cerrar aviso temporalmente/i);
      fireEvent.click(dismissBtn);

      expect(screen.queryByText(/La licencia vence en 5 días/i)).toBeNull();
    });

    it('renders missing notice with activation button for admin', () => {
      const openModalMock = vi.fn();
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { can_config_site: 1, is_siteadmin: 1 },
        licenseStatus: 'missing',
        licenseDaysLeft: 0,
        licenseExpiresAt: 0,
      });
      vi.spyOn(LicenseUiContextModule, 'useLicenseUi').mockReturnValue({
        openLicenseModal: openModalMock,
        closeLicenseModal: vi.fn(),
        isOpen: false,
      });

      render(<LicenseBanner />);
      expect(screen.getByText(/En modo solo lectura/i)).toBeDefined();

      const activateBtn = screen.getByRole('button', { name: /Activar licencia/i });
      fireEvent.click(activateBtn);
      expect(openModalMock).toHaveBeenCalled();
    });

    it('renders message only without activation button for non-admin', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { can_config_site: 0, is_siteadmin: 0 },
        licenseStatus: 'missing',
        licenseDaysLeft: 0,
        licenseExpiresAt: 0,
      });

      render(<LicenseBanner />);
      expect(screen.getByText(/contacta al administrador/i)).toBeDefined();
      expect(screen.queryByRole('button', { name: /Activar licencia/i })).toBeNull();
    });
  });

  describe('LicensedActionButton', () => {
    it('executes onClick when licensed and capability is met', () => {
      const onClickMock = vi.fn();
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 1 },
        isLicensed: true,
      });

      render(
        <LicensedActionButton capability="can_create_courses" onClick={onClickMock}>
          Crear Curso
        </LicensedActionButton>
      );

      const btn = screen.getByRole('button', { name: /Crear Curso/i });
      fireEvent.click(btn);
      expect(onClickMock).toHaveBeenCalled();
    });

    it('disables button and prevents clicks without opening modal when unlicensed', () => {
      const onClickMock = vi.fn();
      const openModalMock = vi.fn();

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 1 },
        isLicensed: false,
      });
      vi.spyOn(LicenseUiContextModule, 'useLicenseUi').mockReturnValue({
        openLicenseModal: openModalMock,
        closeLicenseModal: vi.fn(),
        isOpen: false,
      });

      const { container } = render(
        <LicensedActionButton capability="can_create_courses" onClick={onClickMock}>
          Crear Curso
        </LicensedActionButton>
      );

      const btn = screen.getByRole('button', { name: /Crear Curso/i });
      expect(btn.getAttribute('disabled')).not.toBeNull();
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('title')).toBe('Acción no disponible: requiere activación de licencia');
      expect(container.querySelector('svg.lucide-lock')).toBeNull();

      fireEvent.click(btn);
      expect(onClickMock).not.toHaveBeenCalled();
      expect(openModalMock).not.toHaveBeenCalled();
    });

    it('renders disabled wrapper without lock icon when unlicensed for custom element', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 1 },
        isLicensed: false,
      });

      const { container } = render(
        <LicensedActionButton capability="can_create_courses">
          <span>Elemento Personalizado</span>
        </LicensedActionButton>
      );

      const wrapper = container.querySelector('[aria-disabled="true"]');
      expect(wrapper).not.toBeNull();
      expect(wrapper.getAttribute('title')).toBe('Acción no disponible: requiere activación de licencia');
      expect(container.querySelector('svg.lucide-lock')).toBeNull();
      expect(screen.getByText('Elemento Personalizado')).toBeDefined();
    });

    it('renders fallback when capability is missing', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 0, can_create_courses: 0 },
        isLicensed: true,
      });

      render(
        <LicensedActionButton
          capability="can_create_courses"
          fallback={<span>Sin permiso</span>}
          onClick={() => {}}
        >
          Crear Curso
        </LicensedActionButton>
      );

      expect(screen.queryByText('Crear Curso')).toBeNull();
      expect(screen.getByText('Sin permiso')).toBeDefined();
    });

    it('disables detail view action button when unlicensed without lock icon', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 1, can_update_courses: 1 },
        isLicensed: false,
      });

      const { container } = render(
        <LicensedActionButton
          capability="can_update_courses"
          variant="ghost"
          size="sm"
          title="Editar curso"
          onClick={() => {}}
        >
          Editar curso
        </LicensedActionButton>
      );

      const btn = screen.getByRole('button', { name: /Editar curso/i });
      expect(btn.getAttribute('disabled')).not.toBeNull();
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('title')).toBe('Editar curso');
      expect(container.querySelector('svg.lucide-lock')).toBeNull();
    });

    it('disables course competencies tab action buttons when unlicensed', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        isLicensed: false,
        permissions: { is_siteadmin: 1, can_update_courses: 1 },
      });

      const clickSpy = vi.fn();
      const { container } = render(
        <LicensedActionButton
          capability="can_update_courses"
          variant="ghost"
          size="icon"
          title="Vincular actividad del curso a esta competencia"
          onClick={clickSpy}
        >
          <span>Vincular</span>
        </LicensedActionButton>
      );

      const btn = screen.getByRole('button', { name: /Vincular/i });
      expect(btn.getAttribute('disabled')).not.toBeNull();
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('title')).toBe('Vincular actividad del curso a esta competencia');

      fireEvent.click(btn);
      expect(clickSpy).not.toHaveBeenCalled();
      expect(container.querySelector('svg.lucide-lock')).toBeNull();
    });
  });

  describe('Header and Sidebar License Triggers', () => {
    it('opens license modal when clicking Header license trigger', () => {
      const openModalMock = vi.fn();
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { username: 'admin', fullname: 'Admin' },
        permissions: { is_siteadmin: 1, can_config_site: 1 },
        isLicensed: true,
        licenseDaysLeft: 30,
        logout: vi.fn(),
      });
      vi.spyOn(LicenseUiContextModule, 'useLicenseUi').mockReturnValue({
        openLicenseModal: openModalMock,
        closeLicenseModal: vi.fn(),
        isOpen: false,
      });
      vi.spyOn(HelpContextModule, 'useHelp').mockReturnValue({
        isOpen: false,
        toggle: vi.fn(),
      });

      render(<Header />);

      const triggerBtn = screen.getByRole('button', { name: /Gestionar licencia/i });
      fireEvent.click(triggerBtn);
      expect(openModalMock).toHaveBeenCalled();
    });

    it('opens license modal when clicking Sidebar license trigger', () => {
      const openModalMock = vi.fn();
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        permissions: { is_siteadmin: 1, can_config_site: 1 },
        isLicensed: true,
        licenseDaysLeft: 30,
      });
      vi.spyOn(LicenseUiContextModule, 'useLicenseUi').mockReturnValue({
        openLicenseModal: openModalMock,
        closeLicenseModal: vi.fn(),
        isOpen: false,
      });

      render(<AppSidebar activeTab="dashboard" open={true} onClose={() => {}} />);

      const triggerBtn = screen.getByRole('button', { name: /Gestionar licencia del sistema/i });
      fireEvent.click(triggerBtn);
      expect(openModalMock).toHaveBeenCalled();
    });
  });
});
