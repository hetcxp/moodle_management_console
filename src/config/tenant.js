export const TENANTS = {
  default: {
    name: 'Moodle Adminer',
    subtitle: 'Management Studio',
    moodleUrl: import.meta.env.VITE_MOODLE_URL || '/moodle',
    serviceName: import.meta.env.VITE_SERVICE_NAME || 'adminer_service',
    colors: {
      primary: '#2563eb', // Modern royal blue
      accent: '#3b82f6',
      surface: '#ffffff',
      background: '#f8fafc'
    },
    logo: 'https://moodle.com/wp-content/uploads/2021/06/22024-Moodle-logo-white.png'
  }
};

export function getTenantConfig() {
  if (typeof window !== 'undefined' && window.ADMINER_CONFIG) {
    return {
      ...TENANTS['default'],
      moodleUrl: window.ADMINER_CONFIG.moodleUrl,
      serviceName: window.ADMINER_CONFIG.serviceName,
      embedded: window.ADMINER_CONFIG.embedded || false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tenantKey = params.get('tenant') || import.meta.env.VITE_TENANT || 'default';
  return TENANTS[tenantKey] || TENANTS['default'];
}

export function applyTenantTheme() {
  const config = getTenantConfig();
  const root = document.documentElement;
  
  if (config.colors?.primary) root.style.setProperty('--color-tenant-primary', config.colors.primary);
  if (config.colors?.accent) root.style.setProperty('--color-tenant-accent', config.colors.accent);
  
  return config;
}
