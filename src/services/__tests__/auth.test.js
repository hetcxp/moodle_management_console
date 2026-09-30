import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, TOKEN_TTL_MS } from '../auth.js';

describe('AuthService (TD-SEC-004)', () => {
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

    it('reads token exclusively from sessionStorage and purges legacy localStorage token', () => {
      localStorage.setItem('adminer_token', 'leak-token');
      sessionStorage.setItem('adminer_token', 'sess-token');

      expect(AuthService.getToken()).toBe('sess-token');
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('getUser parses stored json safely and handles corrupted storage gracefully', () => {
      expect(AuthService.getUser()).toBeNull();

      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1, fullname: 'Admin' }));
      expect(AuthService.getUser()).toEqual({ userid: 1, fullname: 'Admin' });

      // Corrupt JSON test
      sessionStorage.setItem('adminer_user', '{corrupted_json_string');
      expect(AuthService.getUser()).toBeNull();
      expect(sessionStorage.getItem('adminer_user')).toBeNull();
    });
  });

  describe('isAuthenticated and TTL alignment', () => {
    it('returns true when window config has a token and user', () => {
      window.MANAGEMENT_CONSOLE_CONFIG = { token: 'config-token', user: { userid: 1 } };
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('returns false when window config has a token but no user', () => {
      window.MANAGEMENT_CONSOLE_CONFIG = { token: 'config-token' };
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns false when no token or no user stored', () => {
      expect(AuthService.isAuthenticated()).toBe(false);

      sessionStorage.setItem('adminer_token', 'my-token');
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns false and logs out if token is expired (> 8 hours)', () => {
      sessionStorage.setItem('adminer_token', 'old-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      
      const nineHoursAgo = Date.now() - (9 * 60 * 60 * 1000);
      sessionStorage.setItem('adminer_token_date', nineHoursAgo.toString());

      expect(AuthService.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
    });

    it('returns false and logs out if token timestamp is NaN, negative, or in the future', () => {
      sessionStorage.setItem('adminer_token', 'nan-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));

      sessionStorage.setItem('adminer_token_date', 'not-a-number');
      expect(AuthService.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('adminer_token')).toBeNull();

      // Negative timestamp
      sessionStorage.setItem('adminer_token', 'neg-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      sessionStorage.setItem('adminer_token_date', '-1000');
      expect(AuthService.isAuthenticated()).toBe(false);

      // Future timestamp
      sessionStorage.setItem('adminer_token', 'future-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      sessionStorage.setItem('adminer_token_date', String(Date.now() + 1000000));
      expect(AuthService.isAuthenticated()).toBe(false);
    });

    it('returns false if token has no timestamp', () => {
      sessionStorage.setItem('adminer_token', 'untimestamped-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));

      expect(AuthService.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
    });

    it('returns true when token and user are valid within 8 hours', () => {
      sessionStorage.setItem('adminer_token', 'valid-token');
      sessionStorage.setItem('adminer_user', JSON.stringify({ userid: 1 }));
      sessionStorage.setItem('adminer_token_date', (Date.now() - (2 * 60 * 60 * 1000)).toString());

      expect(AuthService.isAuthenticated()).toBe(true);
      expect(TOKEN_TTL_MS).toBe(8 * 60 * 60 * 1000);
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

    it('login saves token and user in sessionStorage and never in localStorage', async () => {
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
      expect(sessionStorage.getItem('adminer_token')).toBe('new-token');
      expect(localStorage.getItem('adminer_token')).toBeNull();
      expect(JSON.parse(sessionStorage.getItem('adminer_user'))).toEqual(
        expect.objectContaining({ userid: 2, username: 'admin' })
      );
    });

    it('validateToken stores in sessionStorage and returns user object', async () => {
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
      expect(sessionStorage.getItem('adminer_token')).toBe('token-123');
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('validateToken throws error on HTTP failure and does not store credentials (TD-AUTH-004)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(AuthService.validateToken('bad-token')).rejects.toThrow('Error de conexión HTTP: 401');
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
      expect(sessionStorage.getItem('adminer_user')).toBeNull();
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('validateToken throws error on incomplete user identity and does not store credentials (TD-AUTH-004)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sitename: 'Moodle Dev',
          // missing userid and username
        }),
      });

      await expect(AuthService.validateToken('partial-token')).rejects.toThrow(
        'Identidad de usuario incompleta en la respuesta de validación.'
      );
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
      expect(sessionStorage.getItem('adminer_user')).toBeNull();
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('validateToken throws error when response contains exception (TD-AUTH-004)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          exception: 'moodle_exception',
          errorcode: 'invalidtoken',
          message: 'Token de acceso no válido',
        }),
      });

      await expect(AuthService.validateToken('invalid-token')).rejects.toThrow('Token de acceso no válido');
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
      expect(sessionStorage.getItem('adminer_user')).toBeNull();
    });

    it('setManualToken stores token in sessionStorage with timestamp', () => {
      AuthService.setManualToken('manual-token', { username: 'test' });
      expect(sessionStorage.getItem('adminer_token')).toBe('manual-token');
      expect(sessionStorage.getItem('adminer_token_date')).not.toBeNull();
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });

    it('logout clears tokens and users from all storages', () => {
      sessionStorage.setItem('adminer_token', 'token');
      sessionStorage.setItem('adminer_user', 'user');
      localStorage.setItem('adminer_token', 'leak');
      
      AuthService.logout();
      expect(sessionStorage.getItem('adminer_token')).toBeNull();
      expect(localStorage.getItem('adminer_token')).toBeNull();
    });
  });
});
