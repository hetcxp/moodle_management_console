import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoodleApi } from '../moodle-api.js';
import { AuthService } from '../auth.js';

describe('MoodleApi service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error if no token is available', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue(null);
    await expect(MoodleApi.call('core_test_function')).rejects.toThrow(
      'No hay sesión activa o token disponible.'
    );
  });

  it('uses customToken when provided instead of AuthService.getToken()', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('default-token');
    
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url.toString();
      return Promise.resolve({
        ok: true,
        headers: {
          get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve({ success: true }),
      });
    });

    const res = await MoodleApi.call('core_test', {}, 'custom-special-token');
    expect(res).toEqual({ success: true });
    expect(capturedUrl).toContain('wstoken=custom-special-token');
  });

  it('serializes nested objects and arrays into Moodle WS form format', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('valid-token');
    
    let capturedBody = '';
    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = options.body;
      return Promise.resolve({
        ok: true,
        headers: {
          get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
        },
        json: () => Promise.resolve({ success: true }),
      });
    });

    await MoodleApi.call('some_function', {
      userids: [10, 20],
      filter: { active: 1, text: 'hello' },
      nullable: null,
      undef: undefined,
    });

    const params = new URLSearchParams(capturedBody);
    expect(params.get('userids[0]')).toBe('10');
    expect(params.get('userids[1]')).toBe('20');
    expect(params.get('filter[active]')).toBe('1');
    expect(params.get('filter[text]')).toBe('hello');
    expect(params.has('nullable')).toBe(false);
    expect(params.has('undef')).toBe(false);
  });

  it('throws when HTTP response is not ok', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('valid-token');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(MoodleApi.call('some_func')).rejects.toThrow('Error HTTP 500: Internal Server Error');
  });

  it('throws when content-type is not JSON', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('valid-token');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => 'text/html',
      },
    });

    await expect(MoodleApi.call('some_func')).rejects.toThrow(
      /Moodle respondió con error HTTP 200/
    );
  });

  it('handles Moodle exception and dispatches moodle-auth-error on invalidtoken', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('invalid-token');
    
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: () => Promise.resolve({
        exception: 'moodle_exception',
        errorcode: 'invalidtoken',
        message: 'Token de acceso no válido',
      }),
    });

    await expect(MoodleApi.call('some_func')).rejects.toThrow('Token de acceso no válido');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('handles general Moodle exception without auth event', async () => {
    vi.spyOn(AuthService, 'getToken').mockReturnValue('valid-token');
    
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: () => Promise.resolve({
        exception: 'dml_missing_record_exception',
        errorcode: 'dmlmissingrecord',
        message: 'No se puede encontrar el registro de base de datos',
      }),
    });

    await expect(MoodleApi.call('some_func')).rejects.toThrow('No se puede encontrar el registro de base de datos');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
