import { create } from 'zustand';
import api from '../lib/api';

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuthState = {
  user: User | null;
  setUser: (u: User | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (u) => set({ user: u }),
  setToken: (t) => set({ token: t }),
  logout: async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch { /* ignore */ }
    // FIXED: clear cookie in browser before clearing state
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    set({ user: null, token: null });
  },
  fetchMe: async () => {
    try {
      const res = await api.get('/admin/auth/me');
      set({ user: res.data });
    } catch {
      set({ user: null });
    }
  },
}));
