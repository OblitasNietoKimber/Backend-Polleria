import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../services/authService';
export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
