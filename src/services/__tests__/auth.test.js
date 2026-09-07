import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth.js';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete window.MANAGEMENT_CONSOLE_CONFIG;
    delete window.ADMINER_CONFIG;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getToken and getUser', () => {
    it('retrieves token from window.MANAGEMENT_CONSOLE_CONFIG if present', () => {
      window.MANAGEMENT_CONSOLE_CONFIG = { token: 'mcc-token' };
      expect(AuthService.getToken()).toBe('mcc-token');
    });

    it('retrieves token from window.ADMINER_CONFIG if present', () => {
      window.ADMINER_CONFIG = { token: 'adminer-token' };
      expect(AuthService.getToken()).toBe('adminer-token');
    });

    it('falls back to sessionStorage or localStorage', () => {
      sessionStorage.setItem('adminer_token', 'sess-token');
      expect(AuthService.getToken()).toBe('sess-token');

      sessionStorage.clear();
      localStorage.setItem('adminer_token', 'local-token');
      expect(AuthService.getToken()).toBe('local-token');
    });

    it('getUser parses stored json correctly', () => {
      expect(AuthService.getUser()).toBeNull();

      localStorage.setItem('adminer_user', JSON.stringify({ userid: 1, fullname: 'Admin' }));
      expect(AuthService.getUser()).toEqual({ userid: 1, fullname: 'Admin' });
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when window config has a token', () => {
      window.MANAGEMENT_CONSOLE_CONFIG = { token: 'config-token' };
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('returns false when no token or no user stored', () => {
      expect(AuthService.isAuthenticated()).toBe(false);

      localStorage.setItem('adminer_token', 'my-token');
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns false and logs out if token is expired (> 12 weeks)', () => {
      localStorage.setItem('adminer_token', 'old-token');
      localStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      
      const thirteenWeeksAgo = Date.now() - (13 * 7 * 24 * 60 * 60 * 1000);
      localStorage.setItem('adminer_token_date', thirteenWeeksAgo.toString());

      expect(AuthService.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('returns true when token and user are valid and not expired', () => {
      localStorage.setItem('adminer_token', 'valid-token');
      localStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      localStorage.setItem('adminer_token_date', Date.now().toString());

      expect(AuthService.isAuthenticated()).toBe(true);
    });
  });

  describe('login and validateToken', () => {
    it('login throws error on network failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
      await expect(AuthService.login('admin', 'pass')).rejects.toThrow('Error de conexión durante el login.');
    });

    it('login throws error when service or credentials return error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });
      await expect(AuthService.login('admin', 'bad')).rejects.toThrow('Invalid credentials');
    });

    it('login successfully obtains token and site info and saves to storage', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            userid: 2,
            username: 'admin',
            fullname: 'Admin User',
            sitename: 'Moodle Dev',
          }),
        });

      const res = await AuthService.login('admin', 'secret', true);
      expect(res).toBe(true);
      expect(localStorage.getItem('adminer_token')).toBe('new-token');
      expect(JSON.parse(localStorage.getItem('adminer_user'))).toEqual(
        expect.objectContaining({ userid: 2, username: 'admin' })
      );
    });

    it('validateToken returns user object on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userid: 3,
          username: 'teacher',
          fullname: 'Teacher User',
        }),
      });

      const user = await AuthService.validateToken('token-123');
      expect(user).toEqual(expect.objectContaining({ userid: 3, username: 'teacher' }));
    });

    it('logout clears tokens and users from storage', () => {
      localStorage.setItem('adminer_token', 'token');
      localStorage.setItem('adminer_user', 'user');
      sessionStorage.setItem('adminer_token', 'token');
      
      AuthService.logout();
      expect(localStorage.getItem('adminer_token')).toBeNull();
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
    });
  });
});
