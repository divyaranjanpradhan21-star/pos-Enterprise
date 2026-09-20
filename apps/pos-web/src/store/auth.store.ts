import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  branchId: string;
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => {
        setAuthToken(user.token);
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'pos-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.user?.token) {
          setAuthToken(state.user.token);
        }
      },
    },
  ),
);
