import { useQuery } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';

// --- Permissions ---
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => AdminerApi.getPermissions(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
