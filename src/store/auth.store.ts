import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string; name: string; email: string; role: string; tenantId: string;
  sellerId?: string; partnerId?: string;
  tenant: { id: string; name: string; slug: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('comissiona_token', data.accessToken);
        set({ user: data.user, token: data.accessToken, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('comissiona_token');
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = '/auth/login';
      },
    }),
    { name: 'comissiona_auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);
