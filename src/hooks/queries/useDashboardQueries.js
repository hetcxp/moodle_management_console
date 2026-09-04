import { useQuery } from '@tanstack/react-query';
import { AdminerApi } from '../../services/adminer-api';

// --- Dashboard ---
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => AdminerApi.getDashboard(),
    refetchInterval: 60000, // 1 minute
  });
}
