import { describe, it, expect } from 'vitest';
import { t } from '../../config/i18n';

describe('i18n helper and dictionary', () => {
  it('returns exact translation when key exists', () => {
    expect(t('common.save')).toBe('Guardar');
    expect(t('common.cancel')).toBe('Cancelar');
    expect(t('reports.category.title')).toBe('Reporte Detallado de Categorías');
  });

  it('returns fallback when key does not exist', () => {
    expect(t('non.existent.key', 'Fallback Text')).toBe('Fallback Text');
    expect(t('common.unknown_action', 'Default Action')).toBe('Default Action');
  });

  it('handles empty or null paths gracefully', () => {
    expect(t('', 'Default')).toBe('Default');
    expect(t(null, 'Default')).toBe('Default');
  });
});
