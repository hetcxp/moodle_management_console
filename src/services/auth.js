import { API_CONFIG } from '../config/api.js';

export const AuthService = {
  getToken() {
    if (typeof window !== 'undefined') {
      const configToken = window.MANAGEMENT_CONSOLE_CONFIG?.token || window.ADMINER_CONFIG?.token;
      if (configToken) return configToken;
    }
    return sessionStorage.getItem('adminer_token') || localStorage.getItem('adminer_token');
  },
  
  getUser() {
    if (typeof window !== 'undefined') {
      const configUser = window.MANAGEMENT_CONSOLE_CONFIG?.user || window.ADMINER_CONFIG?.user;
      if (configUser) return configUser;
    }
    const userStr = sessionStorage.getItem('adminer_user') || localStorage.getItem('adminer_user');
    return userStr ? JSON.parse(userStr) : null;
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
      return true;
    }
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return false;
    
    // Check token expiration (12 weeks)
    const tokenDate = sessionStorage.getItem('adminer_token_date') || localStorage.getItem('adminer_token_date');
    if (tokenDate) {
      const twelveWeeks = 12 * 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(tokenDate, 10) > twelveWeeks) {
        this.logout();
        return false;
      }
    }
    return true;
  },

  async login(username, password, remember = true) {
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
    
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('adminer_token_date', Date.now().toString());

    // Save session
    storage.setItem('adminer_token', token);
    storage.setItem('adminer_user', JSON.stringify(this._buildUserFromSiteInfo(infoData)));
    
    return true;
  },

  async validateToken(token) {
    const infoUrl = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints.rest, window.location.origin);
    infoUrl.searchParams.append('wstoken', token);
    infoUrl.searchParams.append('wsfunction', 'core_webservice_get_site_info');
    infoUrl.searchParams.append('moodlewsrestformat', 'json');
    
    const infoRes = await fetch(infoUrl.toString(), { method: 'POST' });
    const infoData = await infoRes.json();
    
    if (infoData.exception) throw new Error(infoData.message);

    localStorage.setItem('adminer_token', token);
    localStorage.setItem('adminer_token_date', Date.now().toString());
    const user = this._buildUserFromSiteInfo(infoData);
    localStorage.setItem('adminer_user', JSON.stringify(user));
    return user;
  },

  setManualToken(token, user = { fullname: 'Administrador', username: 'admin' }) {
    localStorage.setItem('adminer_token', token);
    localStorage.setItem('adminer_user', JSON.stringify(user));
  },

  logout() {
    sessionStorage.removeItem('adminer_token');
    sessionStorage.removeItem('adminer_user');
    sessionStorage.removeItem('adminer_token_date');
    localStorage.removeItem('adminer_token');
    localStorage.removeItem('adminer_user');
    localStorage.removeItem('adminer_token_date');
  },

  isEmbedded() {
    return typeof window !== 'undefined' && !!(window.MANAGEMENT_CONSOLE_CONFIG?.embedded || window.ADMINER_CONFIG?.embedded);
  }
};
