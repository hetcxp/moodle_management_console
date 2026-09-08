export const TENANTS = {
  default: {
    name: 'Moodle Management Console',
    subtitle: 'Management Studio',
    moodleUrl: import.meta.env.VITE_MOODLE_URL || '/moodle',
    serviceName: import.meta.env.VITE_SERVICE_NAME || 'management_console_service',
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
  const globalConfig = typeof window !== 'undefined' && (window.MANAGEMENT_CONSOLE_CONFIG || window.ADMINER_CONFIG);
  if (globalConfig) {
    let moodleUrl = globalConfig.moodleUrl || '';
    if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && moodleUrl.startsWith('http://')) {
      moodleUrl = 'https://' + moodleUrl.slice(7);
    }
    return {
      ...TENANTS['default'],
      moodleUrl,
      serviceName: globalConfig.serviceName || 'management_console_service',
      embedded: globalConfig.embedded || false,
    };
  }

  const search = typeof window !== 'undefined' && window.location ? window.location.search : '';
  const params = new URLSearchParams(search);
  const tenantKey = params.get('tenant') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TENANT) || 'default';
  return TENANTS[tenantKey] || TENANTS['default'];
}

export function applyTenantTheme() {
  const config = getTenantConfig();
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (config.colors?.primary) root.style.setProperty('--color-tenant-primary', config.colors.primary);
    if (config.colors?.accent) root.style.setProperty('--color-tenant-accent', config.colors.accent);
  }
  return config;
}
