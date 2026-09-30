import { describe, it, expect } from 'vitest';
import { ManagementConsoleApi, AdminerApi } from '../services/management-console-api';

describe('ManagementConsoleApi Alias Export', () => {
  it('exports ManagementConsoleApi identical to AdminerApi', () => {
    expect(ManagementConsoleApi).toBeDefined();
    expect(AdminerApi).toBeDefined();
    expect(ManagementConsoleApi).toBe(AdminerApi);
  });
});
