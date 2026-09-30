import { API_CONFIG } from '../config/api.js';

// Maximum client session TTL aligned with Moodle token validity (8 hours)
export const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

export const AuthService = {
  getToken() {
    if (typeof window !== 'undefined') {
      const configToken = window.MANAGEMENT_CONSOLE_CONFIG?.token || window.ADMINER_CONFIG?.token;
      if (configToken) return configToken;
    }
    // Clean up any legacy token accidentally stored in localStorage
    if (typeof localStorage !== 'undefined' && localStorage.getItem('adminer_token')) {
      localStorage.removeItem('adminer_token');
      localStorage.removeItem('adminer_user');
      localStorage.removeItem('adminer_token_date');
    }
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminer_token') : null;
  },
  
  getUser() {
    if (typeof window !== 'undefined') {
      const configUser = window.MANAGEMENT_CONSOLE_CONFIG?.user || window.ADMINER_CONFIG?.user;
      if (configUser) return configUser;
    }
    const userStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminer_user') : null;
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      // Safe fallback on corrupt session data
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('adminer_user');
      }
      return null;
    }
  },

  _buildUserFromSiteInfo(infoData) {
    return {
      userid: infoData.userid,
      username: infoData.username,
      fullname: infoData.fullname,
      userpictureurl: infoData.userpictureurl,
      sitename: infoData.sitename,
      firstname: infoData.firstname,
      lastname: infoData.lastname
    };
  },
  
  isAuthenticated() {
    if (typeof window !== 'undefined' && (window.MANAGEMENT_CONSOLE_CONFIG?.token || window.ADMINER_CONFIG?.token)) {
      return !!this.getUser();
    }
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return false;
    
    // Check token expiration aligned with Moodle's 8 hours TTL (TD-AUTH-003)
    const tokenDate = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminer_token_date') : null;
    if (tokenDate) {
      const parsedDate = parseInt(tokenDate, 10);
      if (!Number.isFinite(parsedDate) || parsedDate <= 0 || parsedDate > Date.now() || (Date.now() - parsedDate > TOKEN_TTL_MS)) {
        this.logout();
        return false;
      }
    } else {
      // Token without timestamp is considered expired for safety
      this.logout();
      return false;
    }
    return true;
  },

  async login(username, password, _remember = false) {
    const tokenUrl = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints.login, window.location.origin);
    const bodyParams = new URLSearchParams();
    bodyParams.append('username', username);
    bodyParams.append('password', password);
    bodyParams.append('service', API_CONFIG.serviceName);

    const res = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });
    
    if (!res.ok) throw new Error('Error de conexión durante el login.');
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.token) throw new Error('Credenciales inválidas o servicio no asignado.');
    
    const token = data.token;
    
    // Get user info and permissions
    const infoUrl = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints.rest, window.location.origin);
    infoUrl.searchParams.append('wstoken', token);
    infoUrl.searchParams.append('wsfunction', 'core_webservice_get_site_info');
    infoUrl.searchParams.append('moodlewsrestformat', 'json');
    
    const infoRes = await fetch(infoUrl.toString(), { method: 'POST' });
    const infoData = await infoRes.json();
    
    if (infoData.exception) throw new Error(infoData.message);
    
    // Security TD-SEC-004: Persist exclusively in sessionStorage, never in localStorage
    sessionStorage.setItem('adminer_token_date', Date.now().toString());
    sessionStorage.setItem('adminer_token', token);
    sessionStorage.setItem('adminer_user', JSON.stringify(this._buildUserFromSiteInfo(infoData)));
    
    // Ensure localStorage is cleared of any remnants
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adminer_token');
      localStorage.removeItem('adminer_user');
      localStorage.removeItem('adminer_token_date');
    }

    return true;
  },

  async validateToken(token) {
    const infoUrl = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints.rest, window.location.origin);
    infoUrl.searchParams.append('wstoken', token);
    infoUrl.searchParams.append('wsfunction', 'core_webservice_get_site_info');
    infoUrl.searchParams.append('moodlewsrestformat', 'json');
    
    const infoRes = await fetch(infoUrl.toString(), { method: 'POST' });
    if (!infoRes.ok) {
      throw new Error(`Error de conexión HTTP: ${infoRes.status}`);
    }
    const infoData = await infoRes.json();
    
    if (infoData.exception) throw new Error(infoData.message);
    if (!infoData.userid || !infoData.username) {
      throw new Error('Identidad de usuario incompleta en la respuesta de validación.');
    }

    const user = this._buildUserFromSiteInfo(infoData);
    sessionStorage.setItem('adminer_token', token);
    sessionStorage.setItem('adminer_token_date', Date.now().toString());
    sessionStorage.setItem('adminer_user', JSON.stringify(user));

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adminer_token');
      localStorage.removeItem('adminer_user');
      localStorage.removeItem('adminer_token_date');
    }

    return user;
  },

  setManualToken(token, user = { fullname: 'Usuario', username: 'user' }) {
    sessionStorage.setItem('adminer_token', token);
    sessionStorage.setItem('adminer_token_date', Date.now().toString());
    sessionStorage.setItem('adminer_user', JSON.stringify(user));

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adminer_token');
      localStorage.removeItem('adminer_user');
      localStorage.removeItem('adminer_token_date');
    }
  },

  logout() {
    if (!this.isEmbedded()) {
      try {
        const token = this.getToken();
        const moodleUrl = API_CONFIG.baseUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('moodle_url') : null);
        if (token && moodleUrl) {
          const invalidateUrl = new URL(moodleUrl + API_CONFIG.endpoints.rest, window.location.origin);
          invalidateUrl.searchParams.append('wstoken', token);
          invalidateUrl.searchParams.append('wsfunction', 'core_auth_invalidate_tokens');
          invalidateUrl.searchParams.append('moodlewsrestformat', 'json');

          fetch(invalidateUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }).catch(() => {});
        }
      } catch { /* silent fallback */ }
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('adminer_token');
      sessionStorage.removeItem('adminer_user');
      sessionStorage.removeItem('adminer_token_date');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adminer_token');
      localStorage.removeItem('adminer_user');
      localStorage.removeItem('adminer_token_date');
    }
  },

  isEmbedded() {
    return typeof window !== 'undefined' && Boolean(
      window.MANAGEMENT_CONSOLE_CONFIG?.token || window.ADMINER_CONFIG?.token
    );
  }
};
