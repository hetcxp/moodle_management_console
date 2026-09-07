import { API_CONFIG } from '../config/api.js';
import { AuthService } from './auth.js';

export const MoodleApi = {
  async call(wsfunction, params = {}, customToken = null) {
    const token = customToken || AuthService.getToken();
    if (!token) {
      throw new Error('No hay sesión activa o token disponible.');
    }

    const url = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints.rest, window.location.origin);
    url.searchParams.append('wstoken', token);
    url.searchParams.append('wsfunction', wsfunction);
    url.searchParams.append('moodlewsrestformat', 'json');

    const formData = new URLSearchParams();
    
    // Flatten nested objects and arrays for Moodle web service REST format
    const appendParam = (prefix, val) => {
      if (val === null || val === undefined) return;
      if (Array.isArray(val)) {
        val.forEach((item, index) => {
          appendParam(`${prefix}[${index}]`, item);
        });
      } else if (typeof val === 'object') {
        Object.entries(val).forEach(([k, v]) => {
          appendParam(`${prefix}[${k}]`, v);
        });
      } else {
        formData.append(prefix, val);
      }
    };

    Object.entries(params).forEach(([k, v]) => {
      appendParam(k, v);
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Moodle respondió con error HTTP ${response.status} (${response.statusText}). Posible mantenimiento o configuración incorrecta.`);
      }

      const data = await response.json();
      
      if (data && data.exception) {
        if (data.errorcode === 'invalidtoken' || data.errorcode === 'accessexception') {
          window.dispatchEvent(new CustomEvent('moodle-auth-error', { detail: data.message }));
        }
        throw new Error(data.message || data.errorcode || 'Error en la llamada al web service');
      }

      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.error(`[MoodleApi Error in ${wsfunction}]:`, err);
      throw err;
    }
  }
};
